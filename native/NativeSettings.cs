using System.IO;
using System.Text.Json;

namespace Moyu;

internal sealed class NativeSettings
{
    public bool BrowserClipper { get; set; } = true;

    public bool AlwaysOnTop { get; set; }

    public double? MiniLeft { get; set; }

    public double? MiniTop { get; set; }

    public string? MiniEdge { get; set; }

    public static NativeSettings Load()
    {
        try
        {
            if (!File.Exists(NativePaths.SettingsPath)) return new NativeSettings();
            var json = File.ReadAllText(NativePaths.SettingsPath);
            return JsonSerializer.Deserialize<NativeSettings>(json) ?? new NativeSettings();
        }
        catch
        {
            return new NativeSettings();
        }
    }

    public void Save()
    {
        try
        {
            Directory.CreateDirectory(NativePaths.DataRoot);
            var json = JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(NativePaths.SettingsPath, json);
        }
        catch (Exception ex)
        {
            App.Log("native settings save failed: " + ex);
        }
    }
}
