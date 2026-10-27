using System.Collections.Concurrent;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;

namespace Moyu;

internal sealed class ApiRequest
{
    public string Method { get; set; } = "GET";
    public string Path { get; set; } = "/";
    public string Body { get; set; } = "";
    public string CredentialId { get; set; } = "";
    public List<string> Scopes { get; set; } = new();
}

internal sealed class ApiResponse
{
    public int Status { get; set; } = 200;
    public string Body { get; set; } = "{}";
}

internal sealed class LocalApiServer
{
    private readonly CredentialStore _credentials;
    private readonly Func<ApiRequest, Task<ApiResponse>> _forward;
    private readonly CancellationTokenSource _cts = new();
    private TcpListener? _listener;
    private Task? _acceptTask;
    private int _port;

    public LocalApiServer(CredentialStore credentials, Func<ApiRequest, Task<ApiResponse>> forward)
    {
        _credentials = credentials;
        _forward = forward;
    }

    public void Start()
    {
        for (var port = 47821; port <= 47840; port++)
        {
            try
            {
                var listener = new TcpListener(IPAddress.Loopback, port);
                listener.Start();
                _listener = listener;
                _port = port;
                WriteInfo();
                _acceptTask = AcceptLoopAsync(_cts.Token);
                App.Log($"local api listening on 127.0.0.1:{port}");
                return;
            }
            catch
            {
            }
        }
        App.Log("local api could not bind a loopback port");
    }

    public void Stop()
    {
        try { _cts.Cancel(); } catch { }
        try { _listener?.Stop(); } catch { }
        try
        {
            if (File.Exists(NativePaths.ApiInfoPath)) File.Delete(NativePaths.ApiInfoPath);
        }
        catch { }
    }

    private void WriteInfo()
    {
        try
        {
            Directory.CreateDirectory(NativePaths.DataRoot);
            var json = JsonSerializer.Serialize(new
            {
                app = "moyu",
                port = _port,
                pid = Environment.ProcessId,
                startedAt = DateTimeOffset.Now.ToUnixTimeMilliseconds()
            });
            File.WriteAllText(NativePaths.ApiInfoPath, json);
        }
        catch { }
    }

    private async Task AcceptLoopAsync(CancellationToken token)
    {
        while (!token.IsCancellationRequested && _listener is not null)
        {
            TcpClient client;
            try
            {
                client = await _listener.AcceptTcpClientAsync(token);
            }
            catch
            {
                break;
            }
            _ = HandleClientAsync(client);
        }
    }

    private async Task HandleClientAsync(TcpClient client)
    {
        using (client)
        {
            client.ReceiveTimeout = 10000;
            client.SendTimeout = 10000;
            try
            {
                var stream = client.GetStream();
                var request = await ReadRequestAsync(stream);
                if (request is null)
                {
                    await WriteResponseAsync(stream, 400, Error("bad_request", "无法读取请求"));
                    return;
                }

                var (method, path, headers, body) = request.Value;
                if (method == "GET" && path.Split('?')[0] == "/v1/health")
                {
                    await WriteResponseAsync(stream, 200, JsonSerializer.Serialize(new
                    {
                        ok = true,
                        app = "moyu",
                        version = "3.3.1"
                    }));
                    return;
                }

                var auth = headers.TryGetValue("authorization", out var authValue) ? authValue : "";
                var key = auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                    ? auth[7..].Trim()
                    : "";
                var credential = _credentials.Validate(key);
                if (credential is null)
                {
                    await WriteResponseAsync(stream, 401, Error("unauthorized", "凭证无效、已停用或已删除"));
                    return;
                }

                var scope = method == "GET" || method == "HEAD" ? "read" : "write";
                if (!credential.Scopes.Contains(scope))
                {
                    await WriteResponseAsync(stream, 403, Error("forbidden", $"这个凭证没有 {scope} 权限"));
                    return;
                }

                _credentials.MarkUsed(credential);
                ApiResponse response;
                try
                {
                    using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(15));
                    var task = _forward(new ApiRequest
                    {
                        Method = method,
                        Path = path,
                        Body = body,
                        CredentialId = credential.Id,
                        Scopes = credential.Scopes
                    });
                    var completed = await Task.WhenAny(task, Task.Delay(Timeout.Infinite, timeout.Token));
                    if (completed != task)
                    {
                        response = new ApiResponse { Status = 504, Body = Error("timeout", "应用没有及时响应") };
                    }
                    else
                    {
                        response = await task;
                    }
                }
                catch (Exception ex)
                {
                    App.Log("api forward failed: " + ex.Message);
                    response = new ApiResponse { Status = 500, Body = Error("internal", "应用处理失败") };
                }

                await WriteResponseAsync(stream, response.Status, response.Body);
            }
            catch
            {
            }
        }
    }

    private static async Task<(string Method, string Path, Dictionary<string, string> Headers, string Body)?> ReadRequestAsync(NetworkStream stream)
    {
        var buffer = new byte[8192];
        using var all = new MemoryStream();
        var headerEnd = -1;
        while (headerEnd < 0 && all.Length < 128 * 1024)
        {
            var read = await stream.ReadAsync(buffer);
            if (read <= 0) return null;
            all.Write(buffer, 0, read);
            var bytes = all.GetBuffer();
            var length = (int)all.Length;
            for (var i = 3; i < length; i++)
            {
                if (bytes[i - 3] == 13 && bytes[i - 2] == 10 && bytes[i - 1] == 13 && bytes[i] == 10)
                {
                    headerEnd = i - 3;
                    break;
                }
            }
        }
        if (headerEnd < 0) return null;

        var allBytes = all.GetBuffer();
        var headerText = Encoding.UTF8.GetString(allBytes, 0, headerEnd);
        var lines = headerText.Split("\r\n");
        if (lines.Length == 0) return null;
        var requestLine = lines[0].Split(' ');
        if (requestLine.Length < 2) return null;
        var method = requestLine[0].ToUpperInvariant();
        var path = requestLine[1];
        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (var i = 1; i < lines.Length; i++)
        {
            var colon = lines[i].IndexOf(':');
            if (colon <= 0) continue;
            headers[lines[i][..colon].Trim()] = lines[i][(colon + 1)..].Trim();
        }

        var contentLength = 0;
        if (headers.TryGetValue("content-length", out var lengthText))
        {
            int.TryParse(lengthText, out contentLength);
        }
        if (contentLength < 0 || contentLength > 2 * 1024 * 1024) return null;

        var bodyStart = headerEnd + 4;
        var available = (int)all.Length - bodyStart;
        using var bodyStream = new MemoryStream();
        if (available > 0) bodyStream.Write(allBytes, bodyStart, available);
        while (bodyStream.Length < contentLength)
        {
            var read = await stream.ReadAsync(buffer);
            if (read <= 0) break;
            bodyStream.Write(buffer, 0, read);
        }
        var bodyText = Encoding.UTF8.GetString(bodyStream.GetBuffer(), 0, (int)bodyStream.Length);
        return (method, path, headers, bodyText);
    }

    private static async Task WriteResponseAsync(NetworkStream stream, int status, string body)
    {
        var bytes = Encoding.UTF8.GetBytes(body ?? "{}");
        var reason = status switch
        {
            200 => "OK",
            201 => "Created",
            204 => "No Content",
            400 => "Bad Request",
            401 => "Unauthorized",
            403 => "Forbidden",
            404 => "Not Found",
            409 => "Conflict",
            423 => "Locked",
            500 => "Internal Server Error",
            504 => "Gateway Timeout",
            _ => "OK"
        };
        var head = $"HTTP/1.1 {status} {reason}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {bytes.Length}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n";
        var headBytes = Encoding.ASCII.GetBytes(head);
        await stream.WriteAsync(headBytes);
        await stream.WriteAsync(bytes);
        await stream.FlushAsync();
    }

    private static string Error(string code, string message) =>
        JsonSerializer.Serialize(new { ok = false, error = new { code, message } });
}
