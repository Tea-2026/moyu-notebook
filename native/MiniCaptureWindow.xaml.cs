using System.IO;
using System.Net;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using DataFormats = System.Windows.DataFormats;
using DragDropEffects = System.Windows.DragDropEffects;
using DragEventArgs = System.Windows.DragEventArgs;
using IDataObject = System.Windows.IDataObject;
using KeyEventArgs = System.Windows.Input.KeyEventArgs;
using MouseEventArgs = System.Windows.Input.MouseEventArgs;

namespace Moyu;

public partial class MiniCaptureWindow : Window
{
    private readonly Func<ExternalCapture, Task<ExternalCaptureResult>> _save;
    private readonly Action<string>? _openMain;
    private readonly DispatcherTimer _collapseTimer;
    private bool _enabled = true;
    private bool _expanded;
    private bool _hasDraft;
    private bool _saving;
    private bool _animating;
    private double _dockRight = SystemParameters.WorkArea.Right - 12;
    private double _dockBottom = SystemParameters.WorkArea.Bottom - 12;
    private DroppedContent? _draft;

    internal MiniCaptureWindow(Func<ExternalCapture, Task<ExternalCaptureResult>> save, Action<string>? openMain = null)
    {
        InitializeComponent();
        _save = save;
        _openMain = openMain;

        _collapseTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(650) };
        _collapseTimer.Tick += (_, _) =>
        {
            _collapseTimer.Stop();
            if (_expanded && !_hasDraft && !IsKeyboardFocusWithin) Collapse();
        };

        Left = -10000;
        Top = -10000;
    }

    public bool IsExpanded => _expanded;

    public void SetEnabled(bool enabled)
    {
        _enabled = enabled;
        if (!_enabled)
        {
            ResetForm();
            StopShellAnimation();
            _expanded = false;
            ExpandedPanel.Visibility = Visibility.Collapsed;
            CollapsedPanel.Visibility = Visibility.Visible;
            ApplyBounds();
            Hide();
        }
    }

    public void SetDock(Rect workArea)
    {
        _dockRight = workArea.Right - 12;
        _dockBottom = workArea.Bottom - 12;
        if (!_animating) ApplyBounds();
    }

    public void ShowTab()
    {
        if (!_enabled || _animating) return;
        if (!IsVisible) Show();
        if (_expanded)
        {
            CollapsedPanel.Visibility = Visibility.Collapsed;
            ExpandedPanel.Visibility = Visibility.Visible;
        }
        else
        {
            CollapsedPanel.Visibility = Visibility.Visible;
            ExpandedPanel.Visibility = Visibility.Collapsed;
        }
        ShellScale.ScaleX = 1;
        ShellScale.ScaleY = 1;
        Shell.Opacity = 1;
        ApplyBounds();
    }

    public void HideTab()
    {
        if (!IsVisible) return;
        StopShellAnimation();
        Hide();
    }

    public void Expand(bool activate)
    {
        if (!_enabled || _animating) return;
        _collapseTimer.Stop();
        if (!_expanded)
        {
            _expanded = true;
            CollapsedPanel.Visibility = Visibility.Collapsed;
            ExpandedPanel.Visibility = Visibility.Visible;
            ApplyBounds();
            if (!IsVisible) Show();
            AnimateShell(true, activate);
        }
        else if (activate)
        {
            Activate();
            FocusEditor();
        }
    }

    public void Collapse()
    {
        if (_saving || _animating) return;
        if (!_expanded)
        {
            ApplyBounds();
            return;
        }
        if (!IsVisible)
        {
            _expanded = false;
            ExpandedPanel.Visibility = Visibility.Collapsed;
            CollapsedPanel.Visibility = Visibility.Visible;
            ApplyBounds();
            return;
        }
        AnimateShell(false, false);
    }

    private void ApplyBounds()
    {
        var width = _expanded ? 360.0 : 36.0;
        var height = _expanded
            ? Math.Min(480.0, Math.Max(300.0, _dockBottom - SystemParameters.WorkArea.Top - 8))
            : 88.0;
        var left = Math.Max(SystemParameters.VirtualScreenLeft, _dockRight - width);
        var top = Math.Max(SystemParameters.VirtualScreenTop, _dockBottom - height);

        if (Math.Abs(Width - width) > 0.5) Width = width;
        if (Math.Abs(Height - height) > 0.5) Height = height;
        if (Math.Abs(Left - left) > 0.5) Left = left;
        if (Math.Abs(Top - top) > 0.5) Top = top;
    }

    private void AnimateShell(bool opening, bool activate)
    {
        _animating = true;
        var duration = TimeSpan.FromMilliseconds(220);
        var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
        var targetScale = opening ? 1.0 : 0.12;
        var targetScaleY = opening ? 1.0 : 0.16;
        var targetOpacity = opening ? 1.0 : 0.0;

        var scaleX = new DoubleAnimation(opening ? 0.12 : ShellScale.ScaleX, targetScale, duration)
        {
            EasingFunction = ease
        };
        var scaleY = new DoubleAnimation(opening ? 0.16 : ShellScale.ScaleY, targetScaleY, duration)
        {
            EasingFunction = ease
        };
        var opacity = new DoubleAnimation(opening ? 0.25 : Shell.Opacity, targetOpacity, duration)
        {
            EasingFunction = ease
        };

        scaleX.Completed += (_, _) =>
        {
            StopShellAnimation();
            if (opening)
            {
                ShellScale.ScaleX = 1;
                ShellScale.ScaleY = 1;
                Shell.Opacity = 1;
                if (activate)
                {
                    Activate();
                    FocusEditor();
                }
            }
            else
            {
                _expanded = false;
                ExpandedPanel.Visibility = Visibility.Collapsed;
                CollapsedPanel.Visibility = Visibility.Visible;
                ShellScale.ScaleX = 1;
                ShellScale.ScaleY = 1;
                Shell.Opacity = 1;
                ApplyBounds();
            }
        };

        ShellScale.BeginAnimation(ScaleTransform.ScaleXProperty, scaleX);
        ShellScale.BeginAnimation(ScaleTransform.ScaleYProperty, scaleY);
        Shell.BeginAnimation(OpacityProperty, opacity);
    }

    private void StopShellAnimation()
    {
        ShellScale.BeginAnimation(ScaleTransform.ScaleXProperty, null);
        ShellScale.BeginAnimation(ScaleTransform.ScaleYProperty, null);
        Shell.BeginAnimation(OpacityProperty, null);
        _animating = false;
    }

    private void FocusEditor()
    {
        Dispatcher.BeginInvoke(new Action(() =>
        {
            if (_draft is not null) TitleBox.Focus();
            else DropHint.Focus();
        }), DispatcherPriority.Input);
    }

    private void CollapsedPanel_MouseLeftButtonUp(object sender, MouseButtonEventArgs e)
    {
        e.Handled = true;
        if (_enabled) Expand(false);
    }

    private void DropHint_MouseLeftButtonUp(object sender, MouseButtonEventArgs e)
    {
        e.Handled = true;
        StartBlankNote();
    }

    private void NewKind_Click(object sender, RoutedEventArgs e)
    {
        e.Handled = true;
        if (sender is not FrameworkElement element || element.Tag is not string kind) return;
        if (kind == "memo")
        {
            StartBlankNote();
            return;
        }
        ResetForm();
        Collapse();
        _openMain?.Invoke(kind);
    }

    private void StartBlankNote()
    {
        if (_saving || !_enabled) return;
        ResetForm();
        _draft = new DroppedContent
        {
            Kind = "memo",
            MediaType = "",
            SourceLabel = ""
        };
        _hasDraft = true;
        PopulateForm(_draft);
        DropHint.Visibility = Visibility.Collapsed;
        NewKindPanel.Visibility = Visibility.Collapsed;
        FormPanel.Visibility = Visibility.Visible;
        TypePill.Visibility = Visibility.Visible;
        CollapsedDot.Visibility = Visibility.Visible;
        SetStatus("");
        ApplyBounds();
        Activate();
        Dispatcher.BeginInvoke(new Action(() => TitleBox.Focus()), DispatcherPriority.Input);
    }

    private void Window_MouseEnter(object sender, MouseEventArgs e)
    {
        if (!_enabled) return;
        _collapseTimer.Stop();
        CollapsedPanel.Opacity = 1;
    }

    private void Window_MouseLeave(object sender, MouseEventArgs e)
    {
        CollapsedPanel.Opacity = 0.94;
        if (!_expanded || _hasDraft || IsKeyboardFocusWithin || _saving) return;
        _collapseTimer.Stop();
        _collapseTimer.Start();
    }

    private void Window_Deactivated(object? sender, EventArgs e)
    {
        if (!_expanded || _saving) return;
        if (_hasDraft)
        {
            Collapse();
            return;
        }
        _collapseTimer.Stop();
        _collapseTimer.Start();
    }

    private void Window_DragEnter(object sender, DragEventArgs e)
    {
        if (!_enabled) return;
        e.Effects = DragDropEffects.Copy;
        e.Handled = true;
        _collapseTimer.Stop();
        Expand(false);
        DropHint.Background = (System.Windows.Media.Brush)FindResource("AccentSoftBrush");
    }

    private void Window_DragOver(object sender, DragEventArgs e)
    {
        if (!_enabled) return;
        e.Effects = DragDropEffects.Copy;
        e.Handled = true;
    }

    private void Window_DragLeave(object sender, DragEventArgs e)
    {
        DropHint.Background = (System.Windows.Media.Brush)FindResource("DropBrush");
        if (!_expanded || _hasDraft) return;
        _collapseTimer.Stop();
        _collapseTimer.Start();
    }

    private async void Window_Drop(object sender, DragEventArgs e)
    {
        if (!_enabled) return;
        e.Handled = true;
        DropHint.Background = (System.Windows.Media.Brush)FindResource("DropBrush");
        Expand(true);
        await HandleDropAsync(e.Data);
    }

    private async Task HandleDropAsync(IDataObject data)
    {
        SetStatus("正在收…");
        try
        {
            var draft = ParseDrop(data);
            if (draft is null)
            {
                SetStatus("这个拖不进来，试试文字、链接、图片或音频");
                return;
            }

            _draft = draft;
            _hasDraft = true;
            PopulateForm(draft);
            ApplyBounds();
            DropHint.Visibility = Visibility.Collapsed;
            NewKindPanel.Visibility = Visibility.Collapsed;
            FormPanel.Visibility = Visibility.Visible;
            TypePill.Visibility = Visibility.Visible;
            CollapsedDot.Visibility = Visibility.Visible;
            SetStatus("");
            _ = Dispatcher.BeginInvoke(new Action(() =>
            {
                TitleBox.Focus();
                TitleBox.SelectAll();
            }), DispatcherPriority.Input);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            App.Log("mini drop failed: " + ex);
            SetStatus(ex.Message);
        }
    }

    private DroppedContent? ParseDrop(IDataObject data)
    {
        var html = GetHtml(data);
        var sourceUrl = ExtractSourceUrl(html);
        var fragment = StripCfHtml(html);
        var text = GetText(data);
        var uri = GetUri(data);

        if (data.GetDataPresent(DataFormats.FileDrop) &&
            data.GetData(DataFormats.FileDrop) is string[] files &&
            files.Length > 0)
        {
            var file = files[0];
            if (Directory.Exists(file)) throw new InvalidOperationException("文件夹先不收");
            var info = new FileInfo(file);
            if (!info.Exists) throw new InvalidOperationException("找不到这个文件");
            if (info.Length > 200L * 1024 * 1024) throw new InvalidOperationException("文件超过 200 MB");

            var media = MediaTypeForExtension(info.Extension);
            var stored = CopyFileToStore(file);
            var alt = ExtractTagAttribute(fragment, "img", "alt");
            return new DroppedContent
            {
                Kind = "site",
                Title = string.IsNullOrWhiteSpace(alt) ? Path.GetFileNameWithoutExtension(file) : alt,
                Url = NativePaths.ToFileUrl(Path.GetFileName(stored)),
                Body = "",
                MediaType = media,
                SourceUrl = sourceUrl,
                LocalPath = stored,
                Local = true,
                PreviewPath = media == "image" ? stored : null,
                SourceLabel = sourceUrl
            };
        }

        if (data.GetDataPresent(DataFormats.Bitmap) &&
            data.GetData(DataFormats.Bitmap) is BitmapSource bitmap)
        {
            var stored = SaveBitmap(bitmap);
            return new DroppedContent
            {
                Kind = "site",
                Title = "拖进来的图片",
                Url = NativePaths.ToFileUrl(Path.GetFileName(stored)),
                Body = "",
                MediaType = "image",
                SourceUrl = sourceUrl,
                LocalPath = stored,
                Local = true,
                PreviewPath = stored,
                SourceLabel = sourceUrl
            };
        }

        var imageRaw = ExtractTagAttribute(fragment, "img", "src");
        var imageAlt = ExtractTagAttribute(fragment, "img", "alt");
        var imageUrl = ResolveUrl(imageRaw, sourceUrl);
        if (!string.IsNullOrWhiteSpace(imageUrl))
        {
            var local = TrySaveDataUrl(imageUrl);
            if (local is not null)
            {
                return new DroppedContent
                {
                    Kind = "site",
                    Title = string.IsNullOrWhiteSpace(imageAlt) ? "拖进来的图片" : imageAlt,
                    Url = NativePaths.ToFileUrl(Path.GetFileName(local)),
                    Body = "",
                    MediaType = "image",
                    SourceUrl = sourceUrl,
                    LocalPath = local,
                    Local = true,
                    PreviewPath = local,
                    SourceLabel = sourceUrl
                };
            }

            return new DroppedContent
            {
                Kind = "site",
                Title = string.IsNullOrWhiteSpace(imageAlt) ? FileNameFromUrl(imageUrl) : imageAlt,
                Url = imageUrl,
                Body = "",
                MediaType = "image",
                SourceUrl = sourceUrl,
                SourceLabel = sourceUrl
            };
        }

        var audioRaw = ExtractTagAttribute(fragment, "audio", "src")
            ?? ExtractTagAttribute(fragment, "source", "src");
        var audioUrl = ResolveUrl(audioRaw, sourceUrl);
        if (!string.IsNullOrWhiteSpace(audioUrl))
        {
            return new DroppedContent
            {
                Kind = "site",
                Title = FileNameFromUrl(audioUrl),
                Url = audioUrl,
                Body = "",
                MediaType = "audio",
                SourceUrl = sourceUrl,
                SourceLabel = sourceUrl
            };
        }

        var anchor = ExtractAnchor(fragment);
        var anchorUrl = ResolveUrl(anchor.Href, sourceUrl);
        if (!string.IsNullOrWhiteSpace(anchorUrl))
        {
            return new DroppedContent
            {
                Kind = "site",
                Title = anchor.Text,
                Url = anchorUrl,
                Body = "",
                SourceUrl = sourceUrl,
                SourceLabel = sourceUrl
            };
        }

        var textUrl = NormalizeUrl(uri) is { Length: > 0 } normalizedUri
            ? normalizedUri
            : NormalizeUrl(text);
        if (!string.IsNullOrWhiteSpace(textUrl))
        {
            return new DroppedContent
            {
                Kind = "site",
                Title = LinkTitle(text, textUrl),
                Url = textUrl,
                Body = "",
                SourceUrl = sourceUrl,
                SourceLabel = sourceUrl
            };
        }

        var memo = !string.IsNullOrWhiteSpace(text) ? text : ExtractText(fragment);
        if (!string.IsNullOrWhiteSpace(memo))
        {
            return new DroppedContent
            {
                Kind = "memo",
                Title = FirstLine(memo),
                Url = "",
                Body = memo,
                MediaType = "",
                SourceUrl = sourceUrl,
                SourceLabel = sourceUrl
            };
        }

        return null;
    }

    private void PopulateForm(DroppedContent draft)
    {
        ContentStack.VerticalAlignment = VerticalAlignment.Top;
        ContentScroll.VerticalContentAlignment = VerticalAlignment.Top;
        TypeText.Text = draft.TypeLabel;
        SourceText.Text = string.IsNullOrWhiteSpace(draft.SourceLabel)
            ? draft.TypeLabel
            : draft.SourceLabel;
        SourceText.Visibility = string.IsNullOrWhiteSpace(SourceText.Text)
            ? Visibility.Collapsed
            : Visibility.Visible;
        TitleBox.Text = draft.Title;
        BodyBox.Text = draft.Body;
        TagsBox.Text = "";

        PreviewFrame.Visibility = Visibility.Collapsed;
        PreviewImage.Source = null;
        AttachmentFrame.Visibility = Visibility.Collapsed;

        if (draft.MediaType == "image")
        {
            if (!string.IsNullOrWhiteSpace(draft.PreviewPath))
            {
                TryLoadPreview(draft.PreviewPath);
            }
            else
            {
                AttachmentText.Text = "网页图片 · 保存的是链接";
                AttachmentFrame.Visibility = Visibility.Visible;
            }
        }
        else if (draft.MediaType is "audio" or "file")
        {
            AttachmentText.Text = draft.Local
                ? Path.GetFileName(draft.LocalPath)
                : draft.Title;
            AttachmentFrame.Visibility = Visibility.Visible;
        }
    }

    private void TryLoadPreview(string uriOrPath)
    {
        try
        {
            var bitmap = new BitmapImage();
            bitmap.BeginInit();
            bitmap.CacheOption = BitmapCacheOption.OnLoad;
            bitmap.DecodePixelWidth = 620;
            bitmap.UriSource = new Uri(uriOrPath, UriKind.Absolute);
            bitmap.EndInit();
            PreviewImage.Source = bitmap;
            PreviewFrame.Visibility = Visibility.Visible;
        }
        catch
        {
            PreviewFrame.Visibility = Visibility.Collapsed;
        }
    }

    private async Task SaveAsync()
    {
        if (_saving || _draft is null) return;
        var draft = _draft;

        if (string.IsNullOrWhiteSpace(TitleBox.Text) &&
            string.IsNullOrWhiteSpace(BodyBox.Text) &&
            string.IsNullOrWhiteSpace(draft.Url))
        {
            SetStatus("写点什么再收好");
            TitleBox.Focus();
            return;
        }

        _saving = true;
        SaveButton.IsEnabled = false;
        SetStatus("正在收…");
        try
        {
            var result = await _save(new ExternalCapture(
                draft.Kind,
                TitleBox.Text.Trim(),
                draft.Url,
                BodyBox.Text,
                ParseTags(TagsBox.Text),
                draft.MediaType,
                draft.SourceUrl,
                draft.LocalPath,
                draft.Local));

            if (result.Ok)
            {
                SetStatus("收好了");
                CollapsedDot.Visibility = Visibility.Collapsed;
                _hasDraft = false;
                _draft = null;
                await Task.Delay(680);
                ResetForm();
                Collapse();
            }
            else
            {
                SetStatus(result.Error == "locked" ? "笔记本已上锁，先在主窗口解锁" : "没收进去，再试一次");
            }
        }
        catch (Exception ex)
        {
            App.Log("mini save failed: " + ex);
            SetStatus("没收进去，再试一次");
        }
        finally
        {
            _saving = false;
            SaveButton.IsEnabled = true;
        }
    }

    private static string[] ParseTags(string input)
    {
        return input
            .Replace('，', ',')
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select((tag) => tag.Trim().TrimStart('#'))
            .Where((tag) => tag.Length > 0)
            .Distinct(StringComparer.CurrentCultureIgnoreCase)
            .Take(8)
            .ToArray();
    }

    private void SaveButton_Click(object sender, RoutedEventArgs e)
    {
        if (_draft is null)
        {
            StartBlankNote();
            return;
        }
        _ = SaveAsync();
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        ResetForm();
        Collapse();
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        ResetForm();
        Collapse();
    }

    private void Window_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Escape)
        {
            ResetForm();
            Collapse();
            e.Handled = true;
            return;
        }
        if (e.Key == Key.Enter && (Keyboard.Modifiers & ModifierKeys.Control) != 0)
        {
            _ = SaveAsync();
            e.Handled = true;
        }
    }

    private void ResetForm()
    {
        _draft = null;
        _hasDraft = false;
        _saving = false;
        FormPanel.Visibility = Visibility.Collapsed;
        DropHint.Visibility = Visibility.Visible;
        NewKindPanel.Visibility = Visibility.Visible;
        ContentStack.VerticalAlignment = VerticalAlignment.Center;
        ContentScroll.VerticalContentAlignment = VerticalAlignment.Center;
        TypePill.Visibility = Visibility.Collapsed;
        PreviewFrame.Visibility = Visibility.Collapsed;
        PreviewImage.Source = null;
        AttachmentFrame.Visibility = Visibility.Collapsed;
        CollapsedDot.Visibility = Visibility.Collapsed;
        TitleBox.Text = "";
        BodyBox.Text = "";
        TagsBox.Text = "";
        SetStatus("");
    }

    private void SetStatus(string message)
    {
        StatusText.Text = message;
        StatusText.Visibility = string.IsNullOrWhiteSpace(message) ? Visibility.Collapsed : Visibility.Visible;
    }

    private static string GetText(IDataObject data)
    {
        foreach (var format in new[] { DataFormats.UnicodeText, DataFormats.Text })
        {
            try
            {
                if (data.GetDataPresent(format) && data.GetData(format) is string value && value.Length > 0)
                {
                    return value;
                }
            }
            catch { }
        }
        return "";
    }

    private static string GetUri(IDataObject data)
    {
        foreach (var format in new[] { "UniformResourceLocatorW", "UniformResourceLocator", DataFormats.Text, DataFormats.UnicodeText })
        {
            try
            {
                if (data.GetDataPresent(format) && data.GetData(format) is string value && value.Length > 0)
                {
                    return value;
                }
            }
            catch { }
        }
        return "";
    }

    private static string GetHtml(IDataObject data)
    {
        try
        {
            if (data.GetDataPresent(DataFormats.Html) && data.GetData(DataFormats.Html) is string html)
            {
                return html;
            }
        }
        catch { }
        return "";
    }

    private static string StripCfHtml(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return "";
        var start = html.IndexOf("<html", StringComparison.OrdinalIgnoreCase);
        if (start < 0) start = html.IndexOf("<body", StringComparison.OrdinalIgnoreCase);
        if (start > 0) html = html.Substring(start);
        return html;
    }

    private static string ExtractSourceUrl(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return "";
        var match = Regex.Match(html, @"(?im)^\s*SourceURL:\s*(\S+)\s*$");
        return match.Success ? ResolveUrl(match.Groups[1].Value, "") : "";
    }

    private static string ExtractTagAttribute(string html, string tag, string attribute)
    {
        if (string.IsNullOrWhiteSpace(html)) return "";
        var pattern = "<" + Regex.Escape(tag) + @"\b[^>]*\b" + Regex.Escape(attribute) + @"\s*=\s*[""']([^""']+)[""']";
        var match = Regex.Match(html, pattern, RegexOptions.IgnoreCase);
        return match.Success ? WebUtility.HtmlDecode(match.Groups[1].Value) : "";
    }

    private static (string Href, string Text) ExtractAnchor(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return ("", "");
        var match = Regex.Match(html, @"<a\b[^>]*\bhref\s*=\s*[""']([^""']+)[""'][^>]*>(.*?)</a>",
            RegexOptions.IgnoreCase | RegexOptions.Singleline);
        if (!match.Success) return ("", "");
        var text = Regex.Replace(match.Groups[2].Value, "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        text = Regex.Replace(text, @"\s+", " ").Trim();
        return (WebUtility.HtmlDecode(match.Groups[1].Value), text);
    }

    private static string ExtractText(string html)
    {
        if (string.IsNullOrWhiteSpace(html)) return "";
        var text = Regex.Replace(html, "<[^>]+>", " ");
        text = WebUtility.HtmlDecode(text);
        return Regex.Replace(text, @"\s+", " ").Trim();
    }

    private static string ResolveUrl(string raw, string baseUrl)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "";
        raw = WebUtility.HtmlDecode(raw.Trim());
        if (raw.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)) return raw;

        if (Uri.TryCreate(raw, UriKind.Absolute, out var absolute) &&
            (absolute.Scheme == Uri.UriSchemeHttp || absolute.Scheme == Uri.UriSchemeHttps))
        {
            return absolute.AbsoluteUri;
        }

        if (!string.IsNullOrWhiteSpace(baseUrl) &&
            Uri.TryCreate(baseUrl, UriKind.Absolute, out var baseUri) &&
            Uri.TryCreate(baseUri, raw, out var relative) &&
            (relative.Scheme == Uri.UriSchemeHttp || relative.Scheme == Uri.UriSchemeHttps))
        {
            return relative.AbsoluteUri;
        }

        return NormalizeUrl(raw);
    }

    private static string NormalizeUrl(string raw)
    {
        var text = (raw ?? "").Trim();
        if (text.Length == 0) return "";
        var found = Regex.Match(text, @"https?://[^\s<>""']+", RegexOptions.IgnoreCase);
        if (found.Success) text = found.Value.TrimEnd('.', ',', ';', '!', '?', ')', ']', '}');
        if (!Regex.IsMatch(text, @"^[a-z][a-z0-9+.-]*:", RegexOptions.IgnoreCase)) text = "https://" + text;
        if (!Uri.TryCreate(text, UriKind.Absolute, out var uri)) return "";
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) return "";
        if (string.IsNullOrWhiteSpace(uri.Host) || (!uri.Host.Contains('.') && uri.Host != "localhost")) return "";
        return uri.AbsoluteUri;
    }

    private static string LinkTitle(string text, string url)
    {
        var value = (text ?? "").Trim();
        if (value.Length > 0 && value.Length <= 200 && !value.Contains("://")) return value;
        return FileNameFromUrl(url);
    }

    private static string FileNameFromUrl(string url)
    {
        try
        {
            var name = Path.GetFileName(new Uri(url).AbsolutePath);
            return string.IsNullOrWhiteSpace(name) ? new Uri(url).Host : Uri.UnescapeDataString(name);
        }
        catch
        {
            return "链接";
        }
    }

    private static string FirstLine(string text)
    {
        var line = (text ?? "").Replace("\r", "").Split('\n')[0].Trim();
        if (line.Length > 70) line = line[..70];
        return string.IsNullOrWhiteSpace(line) ? "随手记" : line;
    }

    private static string MediaTypeForExtension(string extension)
    {
        var ext = extension.ToLowerInvariant();
        return ext switch
        {
            ".png" or ".jpg" or ".jpeg" or ".gif" or ".webp" or ".bmp" or ".avif" or ".svg" => "image",
            ".mp3" or ".wav" or ".m4a" or ".aac" or ".ogg" or ".flac" or ".opus" or ".wma" => "audio",
            _ => "file"
        };
    }

    private static string CopyFileToStore(string source)
    {
        var extension = SafeExtension(Path.GetExtension(source));
        var baseName = SafeBaseName(Path.GetFileNameWithoutExtension(source));
        var directory = NativePaths.FilesRoot;
        var candidate = Path.Combine(directory, baseName + extension);
        var index = 2;
        while (File.Exists(candidate))
        {
            candidate = Path.Combine(directory, baseName + "-" + index.ToString() + extension);
            index++;
        }
        File.Copy(source, candidate);
        return candidate;
    }

    private static string SaveBitmap(BitmapSource bitmap)
    {
        var directory = NativePaths.FilesRoot;
        var name = "image-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N")[..6] + ".png";
        var path = Path.Combine(directory, name);
        using var stream = File.Create(path);
        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(bitmap));
        encoder.Save(stream);
        return path;
    }

    private static string? TrySaveDataUrl(string url)
    {
        if (!url.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)) return null;
        var comma = url.IndexOf(',');
        if (comma < 0) return null;
        var meta = url.Substring(5, comma - 5);
        if (!meta.Contains("base64", StringComparison.OrdinalIgnoreCase)) return null;

        try
        {
            var bytes = Convert.FromBase64String(url[(comma + 1)..]);
            if (bytes.Length == 0 || bytes.Length > 200L * 1024 * 1024) return null;
            var extension = meta.StartsWith("image/jpeg", StringComparison.OrdinalIgnoreCase) ? ".jpg"
                : meta.StartsWith("image/gif", StringComparison.OrdinalIgnoreCase) ? ".gif"
                : meta.StartsWith("image/webp", StringComparison.OrdinalIgnoreCase) ? ".webp"
                : ".png";
            var path = Path.Combine(NativePaths.FilesRoot,
                "image-" + DateTime.Now.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N")[..6] + extension);
            File.WriteAllBytes(path, bytes);
            return path;
        }
        catch
        {
            return null;
        }
    }

    private static string SafeExtension(string extension)
    {
        var ext = (extension ?? "").ToLowerInvariant();
        return Regex.IsMatch(ext, @"^\.[a-z0-9]{1,8}$") ? ext : ".bin";
    }

    private static string SafeBaseName(string name)
    {
        var cleaned = Regex.Replace(name ?? "", @"[<>:""/\\|?*\x00-\x1F]", " ").Trim();
        cleaned = Regex.Replace(cleaned, @"\s+", " ");
        if (cleaned.Length == 0) cleaned = "file";
        return cleaned.Length > 60 ? cleaned[..60].Trim() : cleaned;
    }

    private sealed class DroppedContent
    {
        public string Kind { get; init; } = "memo";
        public string Title { get; init; } = "";
        public string Url { get; init; } = "";
        public string Body { get; init; } = "";
        public string MediaType { get; init; } = "";
        public string SourceUrl { get; init; } = "";
        public string LocalPath { get; init; } = "";
        public bool Local { get; init; }
        public string? PreviewPath { get; init; }
        public string SourceLabel { get; init; } = "";

        public string TypeLabel => MediaType switch
        {
            "image" => "图片",
            "audio" => "音频",
            "file" => "文件",
            _ => Kind == "memo" ? "备忘" : "链接"
        };
    }
}
