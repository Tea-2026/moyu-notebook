using System.IO;

namespace Moyu;

internal static class NativePaths
{
    public static string DataRoot =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Moyu");

    public static string FilesRoot
    {
        get
        {
            var path = Path.Combine(DataRoot, "files");
            Directory.CreateDirectory(path);
            return path;
        }
    }

    public static string SettingsPath => Path.Combine(DataRoot, "native-settings.json");

    public static string CredentialsPath => Path.Combine(DataRoot, "credentials.json");

    public static string ApiInfoPath => Path.Combine(DataRoot, "api.json");

    public static string BackupRoot
    {
        get
        {
            var overrideRoot = Environment.GetEnvironmentVariable("MOYU_BACKUP_DIR");
            if (!string.IsNullOrWhiteSpace(overrideRoot))
            {
                var custom = Path.GetFullPath(overrideRoot);
                Directory.CreateDirectory(custom);
                return custom;
            }

            var documents = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            if (string.IsNullOrWhiteSpace(documents))
            {
                documents = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            }
            var path = Path.Combine(documents, "摸鱼笔记本备份");
            Directory.CreateDirectory(path);
            return path;
        }
    }

    public static string ToFileUrl(string storedName) =>
        "https://moyu.files/" + Uri.EscapeDataString(storedName);
}
