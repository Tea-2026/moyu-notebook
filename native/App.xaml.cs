using System.IO;
using System.IO.Pipes;
using System.Threading;
using System.Windows;

namespace Moyu;

public partial class App : System.Windows.Application
{
    private const string MutexName = @"Local\Moyu.SingleInstance";
    private const string PipeName = "Moyu.Command";
    private Mutex? _mutex;
    private MainWindow? _mainWindow;

    public static string? ScreenshotPath { get; private set; }
    public static string? StartHash { get; private set; }
    public static string? UserDataOverride { get; private set; }
    public static bool StartHidden { get; private set; }

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        ParseArgs(e.Args);

        bool createdNew;
        _mutex = new Mutex(true, MutexName, out createdNew);
        if (!createdNew)
        {
            SendCommand(StartHidden ? "noop" : "show");
            Shutdown();
            return;
        }

        ShutdownMode = ShutdownMode.OnExplicitShutdown;
        DispatcherUnhandledException += (_, args) =>
        {
            Log(args.Exception.ToString());
            args.Handled = true;
            System.Windows.MessageBox.Show("摸鱼笔记本遇到了一点问题，已记录到本地日志。", "摸鱼笔记本", MessageBoxButton.OK, MessageBoxImage.Warning);
        };

        _mainWindow = new MainWindow(StartHash, UserDataOverride, StartHidden, ScreenshotPath);
        MainWindow = _mainWindow;

        if (StartHidden)
        {
            _mainWindow.ShowInTaskbar = false;
            _mainWindow.WindowState = WindowState.Minimized;
        }

        _mainWindow.Show();
        SessionEnding += (_, _) => _mainWindow?.PrepareForShutdown();

        StartPipeServer();
    }

    private static void ParseArgs(string[] args)
    {
        for (var i = 0; i < args.Length; i++)
        {
            var arg = args[i];
            switch (arg)
            {
                case "--background":
                case "--tray":
                    StartHidden = true;
                    break;
                case "--capture":
                    StartHash = "#capture";
                    break;
                case "--screenshot":
                    if (i + 1 < args.Length) ScreenshotPath = Path.GetFullPath(args[++i]);
                    break;
                case "--hash":
                    if (i + 1 < args.Length)
                    {
                        var hash = args[++i];
                        StartHash = hash.StartsWith('#') ? hash : "#" + hash;
                    }
                    break;
                case "--user-data":
                    if (i + 1 < args.Length) UserDataOverride = Path.GetFullPath(args[++i]);
                    break;
            }
        }
    }

    private static void SendCommand(string command)
    {
        try
        {
            using var client = new NamedPipeClientStream(".", PipeName, PipeDirection.Out);
            client.Connect(1200);
            using var writer = new StreamWriter(client) { AutoFlush = true };
            writer.WriteLine(command);
        }
        catch
        {
            // The existing instance may be starting up; it is fine to give up quietly.
        }
    }

    private void StartPipeServer()
    {
        _ = Task.Run(async () =>
        {
            while (true)
            {
                try
                {
                    await using var server = new NamedPipeServerStream(
                        PipeName, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                    await server.WaitForConnectionAsync();
                    using var reader = new StreamReader(server);
                    var command = await reader.ReadLineAsync();
                    if (!string.IsNullOrWhiteSpace(command))
                    {
                        Dispatcher.Invoke(() => _mainWindow?.HandleCommand(command.Trim()));
                    }
                }
                catch
                {
                    await Task.Delay(400);
                }
            }
        });
    }

    protected override void OnExit(ExitEventArgs e)
    {
        try { _mutex?.ReleaseMutex(); } catch { }
        _mutex?.Dispose();
        base.OnExit(e);
    }

    public static void Log(string message)
    {
        try
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Moyu");
            Directory.CreateDirectory(dir);
            File.AppendAllText(
                Path.Combine(dir, "app.log"),
                $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}{Environment.NewLine}");
        }
        catch { }
    }
}
