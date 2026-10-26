namespace Moyu;

internal sealed record ExternalCapture(
    string Kind,
    string Title,
    string Url,
    string Body,
    string[] Tags,
    string MediaType,
    string SourceUrl,
    string LocalPath,
    bool Local);

internal sealed record ExternalCaptureResult(bool Ok, string? Error = null);
