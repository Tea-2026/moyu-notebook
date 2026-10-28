using System.ComponentModel;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using Drawing = System.Drawing;
using WinForms = System.Windows.Forms;
using Button = System.Windows.Controls.Button;
using Color = System.Windows.Media.Color;
using SaveFileDialog = Microsoft.Win32.SaveFileDialog;

namespace Moyu;

public partial class MainWindow : Window
{
    private const int WmHotkey = 0x0312;
    private const uint ModAlt = 0x0001;
    private const uint ModControl = 0x0002;
    private const uint ModShift = 0x0004;
    private const uint ModNoRepeat = 0x4000;
    private const int HotkeyId = 0x5348;
    private const int PinHotkeyId = 0x5349;
    private static readonly IntPtr HwndTopmost = new(-1);
    private static readonly IntPtr HwndNotTopmost = new(-2);
    private const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string RunValue = "Moyu";

    private readonly string _webRoot;
    private readonly string _userDataFolder;
    private readonly string? _screenshotPath;
    private readonly string _startHash;
    private readonly bool _startHidden;
    private bool _hotkeyRegistered;
    private bool _pinHotkeyRegistered;
    private string _hotkeyText = "Ctrl Alt N";
    private string _pinHotkeyText = "Ctrl Alt T";
    private HwndSource? _hwndSource;
    private WinForms.NotifyIcon? _tray;
    private Drawing.Icon? _trayIcon;
    private bool _reallyExit;
    private bool _webReady;
    private bool _pendingCapture;
    private bool _trayHintShown;
    private bool _hasBeenShown;
    private bool _isDark;
    private DispatcherTimer? _focusTimer;
    private readonly NativeSettings _nativeSettings;
    private MiniCaptureWindow? _mini;
    private DispatcherTimer? _miniTimer;
    private int _miniTick;
    private WinForms.ToolStripMenuItem? _pinTrayItem;
    private readonly DispatcherTimer _backupTimer;
    private readonly DispatcherTimer _reminderTimer;
    private readonly CredentialStore _credentials;
    private LocalApiServer? _apiServer;
    private readonly ConcurrentDictionary<string, TaskCompletionSource<ApiResponse>> _pendingApi = new();
    private List<ScheduleReminder> _scheduleReminders = new();
    private readonly HashSet<string> _firedReminders = new();
    private string? _pendingBackup;
    private DateTime _lastBackupSnapshot = DateTime.MinValue;
    private bool _lastBalloonReminder;

    private sealed class ScheduleReminder
    {
        public string Id { get; set; } = "";
        public long At { get; set; }
        public string Title { get; set; } = "";
        public string When { get; set; } = "";
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null
    };

    public MainWindow(string? startHash, string? userDataOverride, bool startHidden, string? screenshotPath)
    {
        InitializeComponent();

        _webRoot = Path.Combine(AppContext.BaseDirectory, "web");
        _userDataFolder = string.IsNullOrWhiteSpace(userDataOverride)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Moyu", "WebView2")
            : userDataOverride;
        _screenshotPath = screenshotPath;
        _startHash = startHash ?? string.Empty;
        _startHidden = startHidden;

        try
        {
            Icon = new BitmapImage(new Uri("pack://application:,,,/Assets/app.ico"));
        }
        catch { }

        SourceInitialized += OnSourceInitialized;
        Loaded += OnLoaded;
        Closing += OnClosing;
        StateChanged += OnStateChanged;
        SizeChanged += (_, _) => ApplyRoundedCorners();
        DpiChanged += (_, _) => ApplyRoundedCorners();

        _isDark = IsSystemDark();
        _nativeSettings = NativeSettings.Load();
        Topmost = _nativeSettings.AlwaysOnTop;
        _credentials = new CredentialStore(NativePaths.CredentialsPath);
        _backupTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(900) };
        _backupTimer.Tick += (_, _) =>
        {
            _backupTimer.Stop();
            FlushBackup();
        };
        ApplyChrome(_isDark);
        SetupTray();
        UpdatePinButton();

        _reminderTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(20) };
        _reminderTimer.Tick += (_, _) => CheckScheduleReminders();
        _reminderTimer.Start();

        if (_screenshotPath is null)
        {
            _apiServer = new LocalApiServer(_credentials, ForwardApiRequestAsync);
            _apiServer.Start();
        }
    }

    public void HandleCommand(string command)
    {
        switch (command)
        {
            case "capture":
                ShowAndCapture();
                break;
            case "show":
                ShowFromTray();
                break;
            case "quit":
                _reallyExit = true;
                System.Windows.Application.Current.Shutdown();
                break;
        }
    }

    public void PrepareForShutdown()
    {
        _reallyExit = true;
    }

    /* ---------- Chrome ---------- */
    private void OnSourceInitialized(object? sender, EventArgs e)
    {
        var helper = new WindowInteropHelper(this);
        _hwndSource = HwndSource.FromHwnd(helper.Handle);
        _hwndSource?.AddHook(WndProc);
        RegisterGlobalHotkey(helper.Handle);
        ApplyDwmAttrs();
        UpdateTrayTip();
    }

    private void RegisterGlobalHotkey(IntPtr hwnd)
    {
        var candidates = new (uint Modifiers, uint Key, string Label)[]
        {
            (ModControl | ModAlt | ModNoRepeat, 0x4E, "Ctrl Alt N"),
            (ModControl | ModAlt | ModNoRepeat, 0x20, "Ctrl Alt Space"),
            (ModControl | ModAlt | ModNoRepeat, 0x4A, "Ctrl Alt J")
        };

        var captureRegistered = false;
        foreach (var candidate in candidates)
        {
            if (RegisterHotKey(hwnd, HotkeyId, candidate.Modifiers, candidate.Key))
            {
                captureRegistered = true;
                _hotkeyRegistered = true;
                _hotkeyText = candidate.Label;
                App.Log($"hotkey registered: {candidate.Label}");
                UpdateTrayTip();
                break;
            }
        }
        if (!captureRegistered) App.Log("hotkey registration failed for all candidates");

        var pinCandidates = new (uint Modifiers, uint Key, string Label)[]
        {
            (ModControl | ModAlt | ModNoRepeat, 0x54, "Ctrl Alt T"),
            (ModControl | ModAlt | ModNoRepeat, 0x50, "Ctrl Alt P"),
            (ModControl | ModShift | ModNoRepeat, 0x50, "Ctrl Shift P"),
            (ModControl | ModAlt | ModNoRepeat, 0x4F, "Ctrl Alt O")
        };
        foreach (var candidate in pinCandidates)
        {
            if (RegisterHotKey(hwnd, PinHotkeyId, candidate.Modifiers, candidate.Key))
            {
                _pinHotkeyRegistered = true;
                _pinHotkeyText = candidate.Label;
                App.Log($"pin hotkey registered: {candidate.Label}");
                break;
            }
        }
        if (!_pinHotkeyRegistered)
        {
            _pinHotkeyText = string.Empty;
            App.Log("pin hotkey registration failed");
        }
        UpdatePinTrayItem();
    }

    private void UpdateTrayTip()
    {
        if (_tray is null) return;
        _tray.Text = string.IsNullOrEmpty(_hotkeyText)
            ? "摸鱼笔记本"
            : $"摸鱼笔记本 · {_hotkeyText}";
    }

    private void UpdatePinTrayItem()
    {
        if (_pinTrayItem is null) return;
        _pinTrayItem.ToolTipText = string.IsNullOrWhiteSpace(_pinHotkeyText)
            ? "把主窗口钉在其他窗口上面"
            : $"把主窗口钉在其他窗口上面（{_pinHotkeyText}）";
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WmHotkey && wParam.ToInt64() == HotkeyId)
        {
            handled = true;
            ShowAndCapture();
        }
        else if (msg == WmHotkey && wParam.ToInt64() == PinHotkeyId)
        {
            handled = true;
            ToggleAlwaysOnTop();
        }
        return IntPtr.Zero;
    }

    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (FindVisualAncestor<Button>(e.OriginalSource as DependencyObject) is not null) return;
        if (e.ClickCount == 2)
        {
            ToggleMaximize();
            return;
        }
        try { DragMove(); } catch { }
    }

    private void MinButton_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void PinButton_Click(object sender, RoutedEventArgs e)
    {
        ToggleAlwaysOnTop();
    }

    private void UpdatePinButton()
    {
        if (PinButton is null) return;
        var on = Topmost;
        PinButton.Background = on
            ? new SolidColorBrush(Color.FromRgb(0xE2, 0xEC, 0xE4))
            : System.Windows.Media.Brushes.Transparent;
        if (on)
        {
            PinButton.Foreground = new SolidColorBrush(Color.FromRgb(0x3F, 0x5C, 0x4C));
            PinButton.ToolTip = "取消置顶 (Ctrl+Alt+T)";
        }
        else
        {
            PinButton.SetResourceReference(System.Windows.Controls.Control.ForegroundProperty, "ChromeForegroundBrush");
            PinButton.ToolTip = "钉在最上层 (Ctrl+Alt+T)";
        }
    }

    private void MaxButton_Click(object sender, RoutedEventArgs e)
    {
        ToggleMaximize();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        Close();
    }

    private void ToggleMaximize()
    {
        WindowState = WindowState == WindowState.Maximized ? WindowState.Normal : WindowState.Maximized;
    }

    private void OnStateChanged(object? sender, EventArgs e)
    {
        var maximized = WindowState == WindowState.Maximized;
        MaxButton.Content = maximized ? "\uE923" : "\uE922";
        MaxButton.ToolTip = maximized ? "还原" : "最大化";
        ApplyRoundedCorners();
    }

    private void ApplyChrome(bool dark)
    {
        _isDark = dark;
        var background = dark ? Color.FromRgb(0x1B, 0x1C, 0x19) : Color.FromRgb(0xF2, 0xEF, 0xE6);
        var foreground = dark ? Color.FromRgb(0xE8, 0xE4, 0xD8) : Color.FromRgb(0x2C, 0x2B, 0x27);
        var muted = dark ? Color.FromRgb(0x88, 0x85, 0x7A) : Color.FromRgb(0x8B, 0x88, 0x7C);
        var hover = dark ? Color.FromRgb(0x25, 0x27, 0x22) : Color.FromRgb(0xEC, 0xE8, 0xDC);
        var line = dark ? Color.FromArgb(0x1B, 0xFF, 0xFF, 0xFF) : Color.FromArgb(0x16, 0x00, 0x00, 0x00);

        Resources["ChromeForegroundBrush"] = new SolidColorBrush(foreground);
        Resources["ChromeMutedBrush"] = new SolidColorBrush(muted);
        Resources["ChromeHoverBrush"] = new SolidColorBrush(hover);
        Resources["ChromeLineBrush"] = new SolidColorBrush(line);

        Background = new SolidColorBrush(background);
        TitleBar.Background = new SolidColorBrush(background);
        TitleBar.BorderBrush = new SolidColorBrush(line);
        LoadingOverlay.Background = new SolidColorBrush(background);
        LoadingText.Foreground = new SolidColorBrush(muted);
        TitleText.Foreground = new SolidColorBrush(foreground);

        try
        {
            Web.DefaultBackgroundColor = Drawing.Color.FromArgb(background.R, background.G, background.B);
        }
        catch { }

        ApplyDwmAttrs();
    }

    private void ApplyDwmAttrs()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;
        try
        {
            var darkValue = _isDark ? 1 : 0;
            DwmSetWindowAttribute(hwnd, 20, ref darkValue, sizeof(int));
            DwmSetWindowAttribute(hwnd, 19, ref darkValue, sizeof(int));
            var corner = 2;
            DwmSetWindowAttribute(hwnd, 33, ref corner, sizeof(int));
        }
        catch { }

        ApplyRoundedCorners();
    }

    private void ApplyRoundedCorners()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero) return;

        // Windows 11 already rounds the native frame. Windows 10 needs a
        // window region; this also clips the child WebView2 HWND.
        if (Environment.OSVersion.Version.Build >= 22000) return;

        if (WindowState == WindowState.Maximized)
        {
            SetWindowRgn(hwnd, IntPtr.Zero, true);
            return;
        }

        var dpi = VisualTreeHelper.GetDpi(this);
        var width = (int)Math.Round(ActualWidth * dpi.DpiScaleX);
        var height = (int)Math.Round(ActualHeight * dpi.DpiScaleY);
        if (width <= 0 || height <= 0) return;

        var radius = (int)Math.Round(12 * dpi.DpiScaleX);
        // CreateRoundRectRgn takes the ellipse diameter, not the radius.
        var region = CreateRoundRectRgn(0, 0, width + 1, height + 1, radius * 2, radius * 2);
        if (region == IntPtr.Zero) return;
        if (SetWindowRgn(hwnd, region, true) == 0)
        {
            DeleteObject(region);
        }
    }

    private static bool IsSystemDark()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            return key?.GetValue("AppsUseLightTheme") is int value && value == 0;
        }
        catch { return false; }
    }

    /* ---------- WebView2 ---------- */
    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        if (!Directory.Exists(_webRoot) || !File.Exists(Path.Combine(_webRoot, "index.html")))
        {
            LoadingText.Text = "找不到界面文件，请重新安装摸鱼笔记本。";
            return;
        }

        try
        {
            Directory.CreateDirectory(_userDataFolder);
            var browserArguments = "--disable-features=msWebOOUI,msPdfOOUI --enable-features=OverlayScrollbar";
            if (Environment.GetEnvironmentVariable("MOYU_DEV") == "1")
            {
                browserArguments += " --remote-debugging-port=9223";
            }
            var options = new CoreWebView2EnvironmentOptions
            {
                AdditionalBrowserArguments = browserArguments
            };
            var environment = await CoreWebView2Environment.CreateAsync(null, _userDataFolder, options);
            await Web.EnsureCoreWebView2Async(environment);

            var core = Web.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping(
                "moyu.local", _webRoot, CoreWebView2HostResourceAccessKind.Allow);
            Directory.CreateDirectory(NativePaths.FilesRoot);
            core.SetVirtualHostNameToFolderMapping(
                "moyu.files", NativePaths.FilesRoot, CoreWebView2HostResourceAccessKind.Allow);

            core.Settings.AreBrowserAcceleratorKeysEnabled = false;
            core.Settings.AreDevToolsEnabled = false;
            core.Settings.AreDefaultContextMenusEnabled = false;
            core.Settings.IsStatusBarEnabled = false;
            core.Settings.IsZoomControlEnabled = false;
            core.Settings.IsSwipeNavigationEnabled = false;
            core.Settings.IsPasswordAutosaveEnabled = false;
            core.Settings.IsGeneralAutofillEnabled = false;

            core.WebMessageReceived += OnWebMessageReceived;
            core.NavigationCompleted += OnNavigationCompleted;
            core.NewWindowRequested += OnNewWindowRequested;
            core.DownloadStarting += OnDownloadStarting;

            Web.DefaultBackgroundColor = _isDark
                ? Drawing.Color.FromArgb(0x1B, 0x1C, 0x19)
                : Drawing.Color.FromArgb(0xF2, 0xEF, 0xE6);

            Web.Source = new Uri("https://moyu.local/index.html" + _startHash);

            if (_screenshotPath is null) SetupMiniWindow();
        }
        catch (Exception ex)
        {
            App.Log("WebView2 init failed: " + ex);
            LoadingText.Text = "无法启动内置浏览器，请安装 Microsoft Edge WebView2 Runtime。";
        }
    }

    private void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        if (!e.IsSuccess)
        {
            LoadingText.Text = "页面加载失败，请重新启动摸鱼笔记本。";
            App.Log("Navigation failed: " + e.WebErrorStatus);
            return;
        }

        LoadingOverlay.Visibility = Visibility.Collapsed;
        _webReady = true;

        if (_screenshotPath is not null)
        {
            _ = CaptureScreenshotAsync();
            return;
        }

        if (_startHidden && !_hasBeenShown)
        {
            Hide();
            ShowInTaskbar = false;
        }

        if (_pendingCapture)
        {
            _pendingCapture = false;
            Dispatcher.BeginInvoke(new Action(CaptureInWeb), DispatcherPriority.Input);
        }
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeElement)) return;
            var type = typeElement.GetString();

            switch (type)
            {
                case "ready":
                case "request-platform":
                    SendPlatform();
                    SendTheme();
                    break;

                case "theme":
                    if (root.TryGetProperty("dark", out var darkElement))
                    {
                        ApplyChrome(darkElement.ValueKind == JsonValueKind.True);
                    }
                    break;

                case "clipboard-read":
                    var id = root.TryGetProperty("id", out var idElement) ? idElement.GetInt32() : 0;
                    var text = "";
                    try
                    {
                        text = System.Windows.Clipboard.ContainsText() ? System.Windows.Clipboard.GetText() : "";
                    }
                    catch { }
                    SendWeb(new { type = "clipboard", id, text });
                    break;

                case "open-external":
                    if (root.TryGetProperty("url", out var urlElement))
                    {
                        OpenExternal(urlElement.GetString());
                    }
                    break;

                case "set-autostart":
                    var enabled = root.TryGetProperty("enabled", out var enabledElement) &&
                                  enabledElement.ValueKind == JsonValueKind.True;
                    SetAutoStart(enabled);
                    SendPlatform();
                    break;

                case "open-file":
                    if (root.TryGetProperty("path", out var pathElement))
                    {
                        OpenLocalFile(pathElement.GetString());
                    }
                    break;

                case "backup":
                    if (root.TryGetProperty("data", out var backupElement) &&
                        backupElement.ValueKind == JsonValueKind.String)
                    {
                        QueueBackup(backupElement.GetString());
                    }
                    break;

                case "schedule-reminders":
                    UpdateScheduleReminders(root);
                    break;

                case "api-response":
                    HandleApiResponse(root);
                    break;

                case "credentials-list":
                    SendWeb(new { type = "credentials-list", items = _credentials.ListForUi() });
                    break;

                case "credential-create":
                    HandleCredentialCreate(root);
                    break;

                case "credential-update":
                    HandleCredentialUpdate(root);
                    break;

                case "credential-delete":
                    HandleCredentialDelete(root);
                    break;

                case "credential-copy":
                    HandleCredentialCopy(root);
                    break;

                case "open-folder":
                    if (root.TryGetProperty("folder", out var folderElement))
                    {
                        OpenFolder(folderElement.GetString());
                    }
                    break;

                case "toast":
                    if (root.TryGetProperty("message", out var messageElement))
                    {
                        ShowBalloon("摸鱼笔记本", messageElement.GetString() ?? "");
                    }
                    break;
            }
        }
        catch (Exception ex)
        {
            App.Log("Web message failed: " + ex);
        }
    }

    private static string ApiError(string code, string message) =>
        JsonSerializer.Serialize(new { ok = false, error = new { code, message } });

    private async Task<ApiResponse> ForwardApiRequestAsync(ApiRequest request)
    {
        if (!_webReady)
        {
            return new ApiResponse { Status = 503, Body = ApiError("not_ready", "摸鱼笔记本还在加载") };
        }

        var id = Guid.NewGuid().ToString("N");
        var completion = new TaskCompletionSource<ApiResponse>(TaskCreationOptions.RunContinuationsAsynchronously);
        _pendingApi[id] = completion;
        SendWeb(new
        {
            type = "api-request",
            id,
            method = request.Method,
            path = request.Path,
            body = request.Body,
            scopes = request.Scopes,
            credentialId = request.CredentialId
        });

        var timeout = Task.Delay(TimeSpan.FromSeconds(15));
        var completed = await Task.WhenAny(completion.Task, timeout);
        _pendingApi.TryRemove(id, out _);
        if (completed != completion.Task)
        {
            return new ApiResponse { Status = 504, Body = ApiError("timeout", "应用没有及时响应") };
        }
        return await completion.Task;
    }

    private void HandleApiResponse(JsonElement root)
    {
        var id = root.TryGetProperty("id", out var idElement) ? idElement.GetString() : null;
        if (string.IsNullOrWhiteSpace(id) || !_pendingApi.TryRemove(id, out var completion)) return;
        var status = root.TryGetProperty("status", out var statusElement) && statusElement.TryGetInt32(out var value)
            ? value
            : 500;
        var body = root.TryGetProperty("body", out var bodyElement) && bodyElement.ValueKind == JsonValueKind.String
            ? (bodyElement.GetString() ?? "{}")
            : "{}";
        completion.TrySetResult(new ApiResponse { Status = status, Body = body });
    }

    private void HandleCredentialCreate(JsonElement root)
    {
        var name = root.TryGetProperty("name", out var nameElement) ? (nameElement.GetString() ?? "") : "";
        var scopes = new List<string>();
        if (root.TryGetProperty("scopes", out var scopesElement) && scopesElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in scopesElement.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.String) scopes.Add(item.GetString() ?? "");
            }
        }
        try
        {
            var created = _credentials.Create(name, scopes);
            if (created is null)
            {
                SendWeb(new { type = "credential-error", message = "创建凭证失败" });
                return;
            }
            SendWeb(new { type = "credential-created", item = created.Value.Item, key = created.Value.Key });
        }
        catch (Exception ex)
        {
            App.Log("credential create failed: " + ex.Message);
            SendWeb(new { type = "credential-error", message = "创建凭证失败，系统加密不可用" });
        }
    }

    private void HandleCredentialUpdate(JsonElement root)
    {
        var id = root.TryGetProperty("id", out var idElement) ? (idElement.GetString() ?? "") : "";
        string? name = root.TryGetProperty("name", out var nameElement) && nameElement.ValueKind == JsonValueKind.String
            ? nameElement.GetString()
            : null;
        bool? enabled = root.TryGetProperty("enabled", out var enabledElement) &&
                        (enabledElement.ValueKind == JsonValueKind.True || enabledElement.ValueKind == JsonValueKind.False)
            ? enabledElement.GetBoolean()
            : null;
        if (!_credentials.Update(id, name, enabled))
        {
            SendWeb(new { type = "credential-error", message = "凭证不存在" });
            return;
        }
        SendWeb(new { type = "credential-changed" });
    }

    private void HandleCredentialDelete(JsonElement root)
    {
        var id = root.TryGetProperty("id", out var idElement) ? (idElement.GetString() ?? "") : "";
        if (!_credentials.Delete(id))
        {
            SendWeb(new { type = "credential-error", message = "凭证不存在" });
            return;
        }
        SendWeb(new { type = "credential-changed" });
    }

    private void HandleCredentialCopy(JsonElement root)
    {
        var id = root.TryGetProperty("id", out var idElement) ? (idElement.GetString() ?? "") : "";
        var key = _credentials.CopyKey(id);
        if (string.IsNullOrEmpty(key))
        {
            SendWeb(new { type = "credential-error", message = "这个旧凭证不能取回密钥，请删掉重建" });
            return;
        }
        SendWeb(new { type = "credential-key", id, key });
    }

    private void SendPlatform()
    {
        SendWeb(new
        {
            type = "platform",
            native = true,
            autostart = IsAutoStartEnabled(),
            hotkey = _hotkeyText,
            hotkeyRegistered = _hotkeyRegistered,
            pinHotkey = _pinHotkeyText,
            alwaysOnTop = Topmost,
            version = typeof(MainWindow).Assembly.GetName().Version?.ToString(3) ?? "1.0.0"
        });
    }

    private void SendTheme()
    {
        SendWeb(new { type = "theme", dark = _isDark });
    }

    private void SendWeb(object payload)
    {
        try
        {
            Web.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(payload, JsonOptions));
        }
        catch { }
    }

    private void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        OpenExternal(e.Uri);
    }

    private void OnDownloadStarting(object? sender, CoreWebView2DownloadStartingEventArgs e)
    {
        try
        {
            var suggested = Path.GetFileName(e.ResultFilePath);
            var dialog = new SaveFileDialog
            {
                Title = "保存摸鱼笔记",
                FileName = string.IsNullOrWhiteSpace(suggested) ? $"摸鱼笔记-{DateTime.Now:yyyy-MM-dd}.json" : suggested,
                Filter = "JSON 备份 (*.json)|*.json|所有文件 (*.*)|*.*",
                AddExtension = true,
                OverwritePrompt = true,
                InitialDirectory = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads")
            };
            if (dialog.ShowDialog(this) == true)
            {
                e.ResultFilePath = dialog.FileName;
                e.Handled = true;
            }
            else
            {
                e.Cancel = true;
                e.Handled = true;
            }
        }
        catch (Exception ex)
        {
            App.Log("download handling failed: " + ex);
        }
    }

    private void CaptureInWeb()
    {
        if (!_webReady) { _pendingCapture = true; return; }
        try
        {
            Web.Focus();
            Keyboard.Focus(Web);
            Web.CoreWebView2?.ExecuteScriptAsync(
                "window.moyuNative && window.moyuNative.onHotkey && window.moyuNative.onHotkey();" +
                "setTimeout(function(){var i=document.querySelector('#capUrl');if(i)i.focus();},90);");
        }
        catch (Exception ex)
        {
            App.Log("capture script failed: " + ex);
        }
        Dispatcher.BeginInvoke(new Action(() =>
        {
            Web.Focus();
            Keyboard.Focus(Web);
        }), DispatcherPriority.ContextIdle);
        FocusWebSoon();
    }

    /* ---------- Windowing / hotkey ---------- */
    private void ShowAndCapture()
    {
        ShowFromTray();
        if (!_webReady)
        {
            _pendingCapture = true;
            return;
        }
        Dispatcher.BeginInvoke(new Action(CaptureInWeb), DispatcherPriority.Input);
    }

    private void ShowFromTray()
    {
        _hasBeenShown = true;
        if (!IsVisible) Show();
        ShowInTaskbar = true;
        if (WindowState == WindowState.Minimized) WindowState = WindowState.Normal;
        Activate();
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd != IntPtr.Zero) SetForegroundWindow(hwnd);
        Web.Focus();
        FocusWebSoon();
    }

    private void FocusWebSoon()
    {
        _focusTimer ??= new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(140) };
        _focusTimer.Stop();
        _focusTimer.Tick -= FocusTimerTick;
        _focusTimer.Tick += FocusTimerTick;
        _focusTimer.Start();
    }

    private void FocusTimerTick(object? sender, EventArgs e)
    {
        _focusTimer?.Stop();
        try
        {
            Web.Focus();
            Keyboard.Focus(Web);
        }
        catch { }
    }

    private static void OpenExternal(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return;
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return;
        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            App.Log("open external failed: " + ex);
        }
    }

    /* ---------- Tray / startup ---------- */
    private void SetupTray()
    {
        try
        {
            var resource = System.Windows.Application.GetResourceStream(
                new Uri("pack://application:,,,/Assets/app.ico"));
            if (resource is not null)
            {
                _trayIcon = new Drawing.Icon(resource.Stream);
            }

            _tray = new WinForms.NotifyIcon
            {
                Icon = _trayIcon,
                Text = "摸鱼笔记本 · Ctrl Alt N",
                Visible = true
            };

            var menu = new WinForms.ContextMenuStrip
            {
                Font = new Drawing.Font("Microsoft YaHei UI", 9F)
            };
            MoyuMenuRenderer.StyleMenu(menu);
            var captureItem = new WinForms.ToolStripMenuItem("快速记录")
            {
                Font = new Drawing.Font("Microsoft YaHei UI", 9F, Drawing.FontStyle.Bold)
            };
            captureItem.Click += (_, _) => ShowAndCapture();
            var showItem = new WinForms.ToolStripMenuItem("打开摸鱼笔记本");
            showItem.Click += (_, _) => ShowFromTray();
            var miniItem = new WinForms.ToolStripMenuItem("打开记录小窗");
            miniItem.Click += (_, _) =>
            {
                SetBrowserClipper(true);
                _mini?.ShowTab();
                _mini?.Expand(false);
            };
            var tailItem = new WinForms.ToolStripMenuItem("显示鱼尾") { CheckOnClick = false };
            tailItem.Click += (_, _) => ToggleBrowserClipper();
            var refreshTailItem = new WinForms.ToolStripMenuItem("刷新鱼尾");
            refreshTailItem.Click += (_, _) => RefreshMiniWindow();
            var pinItem = new WinForms.ToolStripMenuItem("钉在最上层") { CheckOnClick = false };
            pinItem.Click += (_, _) => ToggleAlwaysOnTop();
            _pinTrayItem = pinItem;
            var backupItem = new WinForms.ToolStripMenuItem("打开备份文件夹");
            backupItem.Click += (_, _) => OpenFolder("backup");
            var autoStartItem = new WinForms.ToolStripMenuItem("开机启动") { CheckOnClick = false };
            autoStartItem.Click += (_, _) =>
            {
                SetAutoStart(!IsAutoStartEnabled());
                SendPlatform();
            };
            var exitItem = new WinForms.ToolStripMenuItem("退出摸鱼笔记本");
            exitItem.Click += (_, _) => ExitApplication();
            UpdatePinTrayItem();

            menu.Items.Add(captureItem);
            menu.Items.Add(showItem);
            menu.Items.Add(miniItem);
            menu.Items.Add(new WinForms.ToolStripSeparator());
            menu.Items.Add(tailItem);
            menu.Items.Add(refreshTailItem);
            menu.Items.Add(pinItem);
            menu.Items.Add(new WinForms.ToolStripSeparator());
            menu.Items.Add(backupItem);
            menu.Items.Add(autoStartItem);
            menu.Items.Add(new WinForms.ToolStripSeparator());
            menu.Items.Add(exitItem);
            MoyuMenuRenderer.StyleItems(menu.Items);
            menu.Opening += (_, _) =>
            {
                autoStartItem.Checked = IsAutoStartEnabled();
                tailItem.Checked = _nativeSettings.BrowserClipper;
                pinItem.Checked = Topmost;
            };

            _tray.ContextMenuStrip = menu;
            _tray.DoubleClick += (_, _) => ShowFromTray();
            _tray.BalloonTipClicked += (_, _) =>
            {
                var isReminder = _lastBalloonReminder;
                _lastBalloonReminder = false;
                ShowFromTray();
                if (isReminder)
                {
                    SendWeb(new { type = "open-schedule" });
                }
            };
            UpdateTrayTip();
        }
        catch (Exception ex)
        {
            App.Log("tray setup failed: " + ex);
        }
    }

    private void ShowBalloon(string title, string message, int duration = 2600, bool reminder = false)
    {
        try
        {
            _lastBalloonReminder = reminder;
            _tray?.ShowBalloonTip(duration, title, message, WinForms.ToolTipIcon.None);
        }
        catch { }
    }

    private void UpdateScheduleReminders(JsonElement root)
    {
        if (!root.TryGetProperty("reminders", out var listElement) ||
            listElement.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        var list = new List<ScheduleReminder>();
        foreach (var item in listElement.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object) continue;
            var reminder = new ScheduleReminder
            {
                Id = item.TryGetProperty("id", out var id) ? (id.GetString() ?? "") : "",
                Title = item.TryGetProperty("title", out var title) ? (title.GetString() ?? "日程") : "日程",
                When = item.TryGetProperty("when", out var when) ? (when.GetString() ?? "") : ""
            };
            if (item.TryGetProperty("at", out var at) && at.TryGetInt64(out var atMs))
            {
                reminder.At = atMs;
            }
            if (reminder.Id.Length > 0 && reminder.At > 0)
            {
                list.Add(reminder);
            }
        }
        list.Sort((a, b) => a.At.CompareTo(b.At));
        _scheduleReminders = list;
        App.Log($"schedule reminders updated: {list.Count}");
    }

    private void CheckScheduleReminders()
    {
        var now = DateTimeOffset.Now.ToUnixTimeMilliseconds();
        foreach (var reminder in _scheduleReminders)
        {
            if (reminder.At > now) continue;
            if (reminder.At < now - 10 * 60 * 1000) continue;
            var key = reminder.Id + "|" + reminder.At;
            if (!_firedReminders.Add(key)) continue;
            App.Log($"schedule reminder fired: {reminder.Id} at {reminder.At}");
            var message = string.IsNullOrWhiteSpace(reminder.When)
                ? reminder.Title
                : $"{reminder.When} · {reminder.Title}";
            ShowBalloon("日程提醒", message, 7000, true);
        }
    }

    private void OnClosing(object? sender, CancelEventArgs e)
    {
        if (_reallyExit) return;
        e.Cancel = true;
        Hide();
        ShowInTaskbar = false;
        if (!_trayHintShown)
        {
            _trayHintShown = true;
            ShowBalloon("摸鱼笔记本还在后台", $"按 {_hotkeyText} 随时记一条。右键托盘图标可以退出。");
        }
    }

    private void ExitApplication()
    {
        _reallyExit = true;
        if (_tray is not null) _tray.Visible = false;
        System.Windows.Application.Current.Shutdown();
    }

    private bool IsAutoStartEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKey);
            return key?.GetValue(RunValue) is string value && value.Length > 0;
        }
        catch { return false; }
    }

    private void SetAutoStart(bool enabled)
    {
        try
        {
            using var key = Registry.CurrentUser.CreateSubKey(RunKey, true);
            if (key is null) return;
            if (enabled)
            {
                var exe = Environment.ProcessPath ?? Path.Combine(AppContext.BaseDirectory, "Moyu.exe");
                key.SetValue(RunValue, $"\"{exe}\" --background");
            }
            else
            {
                key.DeleteValue(RunValue, false);
            }
        }
        catch (Exception ex)
        {
            App.Log("autostart failed: " + ex);
        }
    }

    /* ---------- Screenshot (development aid) ---------- */
    private async Task CaptureScreenshotAsync()
    {
        if (string.IsNullOrWhiteSpace(_screenshotPath)) return;
        try
        {
            await Task.Delay(1700);
            var directory = Path.GetDirectoryName(_screenshotPath);
            if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
            await using var stream = new FileStream(_screenshotPath, FileMode.Create, FileAccess.Write, FileShare.Read);
            await Web.CoreWebView2!.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream);
            await stream.FlushAsync();
        }
        catch (Exception ex)
        {
            App.Log("screenshot failed: " + ex);
            try { File.WriteAllText(_screenshotPath + ".error.txt", ex.ToString()); } catch { }
        }
        _reallyExit = true;
        Dispatcher.Invoke(() => System.Windows.Application.Current.Shutdown());
    }

    /* ---------- Desktop mini capture ---------- */
    private void SetupMiniWindow()
    {
        try
        {
            _miniTimer?.Stop();
            _mini = new MiniCaptureWindow(CreateExternalCaptureAsync, OpenMiniTarget);
            _mini.SetSavedPosition(_nativeSettings.MiniLeft, _nativeSettings.MiniTop, _nativeSettings.MiniEdge);
            _mini.PositionChanged += (left, top, edge) =>
            {
                _nativeSettings.MiniLeft = left;
                _nativeSettings.MiniTop = top;
                _nativeSettings.MiniEdge = edge;
                _nativeSettings.Save();
            };
            _mini.SetEnabled(_nativeSettings.BrowserClipper);
            _mini.Hide();
            _mini.Closed += (_, _) =>
            {
                _mini = null;
            };

            _miniTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(500) };
            _miniTimer.Tick += (_, _) => UpdateMiniWindow();
            _miniTimer.Start();
        }
        catch (Exception ex)
        {
            App.Log("mini window setup failed: " + ex);
        }
    }

    private void UpdateMiniWindow()
    {
        if (_mini is null)
        {
            if (_nativeSettings.BrowserClipper && _screenshotPath is null && _webReady)
            {
                SetupMiniWindow();
            }
            return;
        }
        if (!_nativeSettings.BrowserClipper || _screenshotPath is not null)
        {
            _mini.HideTab();
            return;
        }

        _mini.SetDock(SystemParameters.WorkArea);
        _mini.ShowTab();
        if (++_miniTick % 4 == 0)
        {
            _mini.EnsureTopmost();
        }
    }

    private void OpenMiniTarget(string target)
    {
        ShowFromTray();
        switch (target)
        {
            case "site":
            case "password":
                SendWeb(new { type = "open-capture", kind = target });
                break;
            case "diary":
                SendWeb(new { type = "open-diary" });
                break;
            case "notes":
                SendWeb(new { type = "open-notes-new" });
                break;
            case "schedule":
                SendWeb(new { type = "open-schedule-new" });
                break;
        }
    }

    private void ToggleBrowserClipper()
    {
        SetBrowserClipper(!_nativeSettings.BrowserClipper);
    }

    private void SetBrowserClipper(bool enabled)
    {
        _nativeSettings.BrowserClipper = enabled;
        _nativeSettings.Save();

        if (!enabled)
        {
            _mini?.SetEnabled(false);
            _mini?.HideTab();
            return;
        }

        if (_mini is null) SetupMiniWindow();
        _mini?.SetEnabled(true);
        _mini?.ShowTab();
        _mini?.EnsureTopmost();
    }

    private void RefreshMiniWindow()
    {
        _nativeSettings.BrowserClipper = true;
        _nativeSettings.Save();
        _miniTimer?.Stop();
        _mini?.Close();
        _mini = null;
        SetupMiniWindow();
        _mini?.ShowTab();
        _mini?.EnsureTopmost();
    }

    private void ToggleAlwaysOnTop()
    {
        SetAlwaysOnTop(!Topmost);
    }

    private void SetAlwaysOnTop(bool enabled)
    {
        Topmost = enabled;
        _nativeSettings.AlwaysOnTop = enabled;
        _nativeSettings.Save();
        try
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            if (hwnd != IntPtr.Zero)
            {
                SetWindowPos(
                    hwnd,
                    enabled ? HwndTopmost : HwndNotTopmost,
                    0,
                    0,
                    0,
                    0,
                    0x0001 | 0x0002 | 0x0010);
            }
        }
        catch { }
        UpdatePinButton();
        SendPlatform();
    }

    private async Task<ExternalCaptureResult> CreateExternalCaptureAsync(ExternalCapture capture)
    {
        for (var i = 0; i < 50 && !_webReady; i++)
        {
            await Task.Delay(100);
        }

        if (!_webReady || Web.CoreWebView2 is null)
        {
            return new ExternalCaptureResult(false, "not-ready");
        }

        try
        {
            var payload = new
            {
                kind = capture.Kind,
                title = capture.Title,
                url = capture.Url,
                body = capture.Body,
                tags = capture.Tags,
                mediaType = capture.MediaType,
                sourceUrl = capture.SourceUrl,
                localPath = capture.LocalPath,
                local = capture.Local
            };
            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var script =
                "(function(){try{" +
                "if(!window.moyuNative||!window.moyuNative.createNote)return {ok:false,error:'bridge'};" +
                "return window.moyuNative.createNote(" + json + ");" +
                "}catch(e){return {ok:false,error:String(e&&e.message||e)};}})()";

            var raw = await Web.CoreWebView2.ExecuteScriptAsync(script);
            return ParseExternalResult(raw);
        }
        catch (Exception ex)
        {
            App.Log("external capture failed: " + ex);
            return new ExternalCaptureResult(false, "script");
        }
    }

    private static ExternalCaptureResult ParseExternalResult(string raw)
    {
        try
        {
            using var doc = JsonDocument.Parse(raw);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.String)
            {
                var inner = root.GetString();
                if (string.IsNullOrWhiteSpace(inner)) return new ExternalCaptureResult(false, "empty");
                using var innerDoc = JsonDocument.Parse(inner);
                root = innerDoc.RootElement.Clone();
            }

            if (root.ValueKind != JsonValueKind.Object) return new ExternalCaptureResult(false, "bad-result");
            var ok = root.TryGetProperty("ok", out var okElement) &&
                     okElement.ValueKind == JsonValueKind.True;
            var error = root.TryGetProperty("error", out var errorElement) &&
                        errorElement.ValueKind == JsonValueKind.String
                ? errorElement.GetString()
                : null;
            return new ExternalCaptureResult(ok, error);
        }
        catch
        {
            return new ExternalCaptureResult(false, "parse");
        }
    }

    private static void OpenLocalFile(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        try
        {
            var full = Path.GetFullPath(path);
            var root = NativePaths.FilesRoot.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            {
                App.Log("open-file outside store rejected: " + full);
                return;
            }
            if (!File.Exists(full)) return;
            Process.Start(new ProcessStartInfo(full) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            App.Log("open-file failed: " + ex);
        }
    }

    private void QueueBackup(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json.Length > 50 * 1024 * 1024) return;
        _pendingBackup = json;
        _backupTimer.Stop();
        _backupTimer.Start();
    }

    private void FlushBackup()
    {
        var json = _pendingBackup;
        if (string.IsNullOrWhiteSpace(json)) return;
        _pendingBackup = null;

        try
        {
            var root = NativePaths.BackupRoot;
            var latest = Path.Combine(root, "latest.json");
            var temp = Path.Combine(root, "latest.tmp");
            File.WriteAllText(temp, json, new UTF8Encoding(false));
            File.Move(temp, latest, true);

            var now = DateTime.UtcNow;
            if (now - _lastBackupSnapshot < TimeSpan.FromMinutes(10)) return;
            _lastBackupSnapshot = now;

            var snapshot = Path.Combine(root, $"moyu-{DateTime.Now:yyyyMMdd-HHmmss}.json");
            File.Copy(latest, snapshot, true);

            var oldSnapshots = Directory.GetFiles(root, "moyu-*.json")
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .Skip(24)
                .ToArray();
            foreach (var old in oldSnapshots)
            {
                try { File.Delete(old); } catch { }
            }
        }
        catch (Exception ex)
        {
            App.Log("backup failed: " + ex);
        }
    }

    private static void OpenFolder(string? folder)
    {
        try
        {
            var path = string.Equals(folder, "backup", StringComparison.OrdinalIgnoreCase)
                ? NativePaths.BackupRoot
                : NativePaths.DataRoot;
            Directory.CreateDirectory(path);
            Process.Start(new ProcessStartInfo(path) { UseShellExecute = true });
        }
        catch (Exception ex)
        {
            App.Log("open folder failed: " + ex);
        }
    }

    /* ---------- Native interop ---------- */
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowPos(
        IntPtr hWnd,
        IntPtr hWndInsertAfter,
        int x,
        int y,
        int cx,
        int cy,
        uint uFlags);

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int width, int height);

    [DllImport("user32.dll")]
    private static extern int SetWindowRgn(IntPtr hwnd, IntPtr region, bool redraw);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr handle);

    private static T? FindVisualAncestor<T>(DependencyObject? node) where T : DependencyObject
    {
        while (node is not null)
        {
            if (node is T target) return target;
            node = VisualTreeHelper.GetParent(node);
        }
        return null;
    }

    protected override void OnClosed(EventArgs e)
    {
        try
        {
            var hwnd = new WindowInteropHelper(this).Handle;
            if (hwnd != IntPtr.Zero)
            {
                UnregisterHotKey(hwnd, HotkeyId);
                UnregisterHotKey(hwnd, PinHotkeyId);
            }
            _hwndSource?.RemoveHook(WndProc);
        }
        catch { }

        try
        {
            _backupTimer.Stop();
            FlushBackup();
            _reminderTimer.Stop();
            _apiServer?.Stop();
            _miniTimer?.Stop();
            _mini?.Close();
            _mini = null;
            if (_tray is not null)
            {
                _tray.Visible = false;
                _tray.Dispose();
            }
            _trayIcon?.Dispose();
            _focusTimer?.Stop();
        }
        catch { }

        base.OnClosed(e);
    }
}
