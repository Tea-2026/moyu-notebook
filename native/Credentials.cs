using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Moyu;

internal sealed class CredentialRecord
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string KeyHash { get; set; } = "";
    public string KeyProtected { get; set; } = "";
    public string Prefix { get; set; } = "";
    public List<string> Scopes { get; set; } = new();
    public bool Enabled { get; set; } = true;
    public long CreatedAt { get; set; }
    public long LastUsedAt { get; set; }
}

internal sealed class CredentialStore
{
    private static readonly string[] AllowedScopes = { "read", "write" };
    private static readonly char[] Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".ToCharArray();
    private readonly object _gate = new();
    private readonly string _path;
    private List<CredentialRecord> _items = new();

    public CredentialStore(string path)
    {
        _path = path;
        Load();
    }

    private void Load()
    {
        try
        {
            if (!File.Exists(_path)) return;
            var text = File.ReadAllText(_path);
            var items = JsonSerializer.Deserialize<List<CredentialRecord>>(text);
            if (items is not null)
            {
                _items = items.Where(item => item is not null && !string.IsNullOrWhiteSpace(item.Id)).ToList();
            }
        }
        catch
        {
            _items = new List<CredentialRecord>();
        }
    }

    private void Save()
    {
        try
        {
            var directory = Path.GetDirectoryName(_path);
            if (!string.IsNullOrWhiteSpace(directory)) Directory.CreateDirectory(directory);
            var temp = _path + ".tmp";
            File.WriteAllText(temp, JsonSerializer.Serialize(_items));
            File.Move(temp, _path, true);
        }
        catch
        {
        }
    }

    public IReadOnlyList<object> ListForUi()
    {
        lock (_gate)
        {
            return _items
                .OrderByDescending(item => item.CreatedAt)
                .Select(item => (object)new
                {
                    id = item.Id,
                    name = item.Name,
                    prefix = item.Prefix,
                    scopes = item.Scopes,
                    enabled = item.Enabled,
                    createdAt = item.CreatedAt,
                    lastUsedAt = item.LastUsedAt,
                    canCopy = !string.IsNullOrEmpty(item.KeyProtected)
                })
                .ToList();
        }
    }

    public string? CopyKey(string id)
    {
        lock (_gate)
        {
            var record = _items.FirstOrDefault(item => item.Id == id);
            if (record is null || string.IsNullOrEmpty(record.KeyProtected)) return null;
            return UnprotectKey(record.KeyProtected);
        }
    }

    public (object Item, string Key)? Create(string name, IEnumerable<string>? scopes)
    {
        lock (_gate)
        {
            var cleanName = (name ?? "").Trim();
            if (cleanName.Length == 0) cleanName = "未命名凭证";
            cleanName = cleanName[..Math.Min(60, cleanName.Length)];
            var cleanScopes = (scopes ?? Array.Empty<string>())
                .Where(scope => AllowedScopes.Contains(scope))
                .Distinct()
                .OrderBy(scope => scope)
                .ToList();
            if (cleanScopes.Count == 0) cleanScopes.Add("read");
            var key = NewKey();
            var record = new CredentialRecord
            {
                Id = Guid.NewGuid().ToString("N"),
                Name = cleanName,
                KeyHash = Hash(key),
                KeyProtected = ProtectKey(key),
                Prefix = key[..6],
                Scopes = cleanScopes,
                Enabled = true,
                CreatedAt = DateTimeOffset.Now.ToUnixTimeMilliseconds()
            };
            _items.Add(record);
            Save();
            return (new
            {
                id = record.Id,
                name = record.Name,
                prefix = record.Prefix,
                scopes = record.Scopes,
                enabled = record.Enabled,
                createdAt = record.CreatedAt,
                lastUsedAt = record.LastUsedAt,
                canCopy = true
            }, key);
        }
    }

    public bool Update(string id, string? name, bool? enabled)
    {
        lock (_gate)
        {
            var record = _items.FirstOrDefault(item => item.Id == id);
            if (record is null) return false;
            if (name is not null)
            {
                var clean = name.Trim();
                if (clean.Length > 0) record.Name = clean[..Math.Min(60, clean.Length)];
            }
            if (enabled.HasValue) record.Enabled = enabled.Value;
            Save();
            return true;
        }
    }

    public bool Delete(string id)
    {
        lock (_gate)
        {
            var removed = _items.RemoveAll(item => item.Id == id);
            if (removed == 0) return false;
            Save();
            return true;
        }
    }

    public CredentialRecord? Validate(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return null;
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(key));
        lock (_gate)
        {
            foreach (var record in _items)
            {
                if (!record.Enabled) continue;
                try
                {
                    var expected = Convert.FromBase64String(record.KeyHash);
                    if (expected.Length == hash.Length && CryptographicOperations.FixedTimeEquals(hash, expected))
                    {
                        return record;
                    }
                }
                catch
                {
                }
            }
        }
        return null;
    }

    public void MarkUsed(CredentialRecord record)
    {
        lock (_gate)
        {
            record.LastUsedAt = DateTimeOffset.Now.ToUnixTimeMilliseconds();
            Save();
        }
    }

    private static string NewKey()
    {
        var bytes = RandomNumberGenerator.GetBytes(40);
        var builder = new StringBuilder(40);
        foreach (var value in bytes) builder.Append(Alphabet[value % Alphabet.Length]);
        return builder.ToString();
    }

    private static string Hash(string key) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(key)));

    [StructLayout(LayoutKind.Sequential)]
    private struct DataBlob
    {
        public int cbData;
        public IntPtr pbData;
    }

    private const int CryptProtectUiForbidden = 0x1;

    [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CryptProtectData(
        ref DataBlob pDataIn,
        string? szDataDescr,
        ref DataBlob pOptionalEntropy,
        IntPtr pvReserved,
        IntPtr pPromptStruct,
        int dwFlags,
        out DataBlob pDataOut);

    [DllImport("crypt32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern bool CryptUnprotectData(
        ref DataBlob pDataIn,
        IntPtr ppszDataDescr,
        ref DataBlob pOptionalEntropy,
        IntPtr pvReserved,
        IntPtr pPromptStruct,
        int dwFlags,
        out DataBlob pDataOut);

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr hMem);

    private static readonly byte[] DpapiEntropy = Encoding.UTF8.GetBytes("Moyu.ApiKey.v1");

    private static string ProtectKey(string key) => Convert.ToBase64String(ProtectBytes(Encoding.UTF8.GetBytes(key)));

    private static string? UnprotectKey(string protectedKey)
    {
        try
        {
            var bytes = UnprotectBytes(Convert.FromBase64String(protectedKey));
            return bytes is null ? null : Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return null;
        }
    }

    private static byte[] ProtectBytes(byte[] data)
    {
        var inputPtr = Marshal.AllocHGlobal(data.Length);
        var entropyPtr = Marshal.AllocHGlobal(DpapiEntropy.Length);
        DataBlob output = default;
        try
        {
            Marshal.Copy(data, 0, inputPtr, data.Length);
            Marshal.Copy(DpapiEntropy, 0, entropyPtr, DpapiEntropy.Length);
            var input = new DataBlob { cbData = data.Length, pbData = inputPtr };
            var entropy = new DataBlob { cbData = DpapiEntropy.Length, pbData = entropyPtr };
            if (!CryptProtectData(ref input, "Moyu local API credential", ref entropy, IntPtr.Zero, IntPtr.Zero, CryptProtectUiForbidden, out output))
            {
                throw new InvalidOperationException("DPAPI protect failed: " + Marshal.GetLastWin32Error());
            }
            var result = new byte[output.cbData];
            Marshal.Copy(output.pbData, result, 0, output.cbData);
            return result;
        }
        finally
        {
            if (output.pbData != IntPtr.Zero) LocalFree(output.pbData);
            Marshal.FreeHGlobal(inputPtr);
            Marshal.FreeHGlobal(entropyPtr);
        }
    }

    private static byte[]? UnprotectBytes(byte[] data)
    {
        var inputPtr = Marshal.AllocHGlobal(data.Length);
        var entropyPtr = Marshal.AllocHGlobal(DpapiEntropy.Length);
        DataBlob output = default;
        try
        {
            Marshal.Copy(data, 0, inputPtr, data.Length);
            Marshal.Copy(DpapiEntropy, 0, entropyPtr, DpapiEntropy.Length);
            var input = new DataBlob { cbData = data.Length, pbData = inputPtr };
            var entropy = new DataBlob { cbData = DpapiEntropy.Length, pbData = entropyPtr };
            if (!CryptUnprotectData(ref input, IntPtr.Zero, ref entropy, IntPtr.Zero, IntPtr.Zero, CryptProtectUiForbidden, out output))
            {
                return null;
            }
            var result = new byte[output.cbData];
            Marshal.Copy(output.pbData, result, 0, output.cbData);
            return result;
        }
        finally
        {
            if (output.pbData != IntPtr.Zero) LocalFree(output.pbData);
            Marshal.FreeHGlobal(inputPtr);
            Marshal.FreeHGlobal(entropyPtr);
        }
    }
}
