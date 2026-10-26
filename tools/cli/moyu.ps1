# Moyu local CLI. Windows PowerShell 5.1 compatible.
$ErrorActionPreference = 'Stop'

$Help = @'
moyu - 摸鱼笔记本本地命令行

用法:
  moyu --help
  moyu health
  moyu summary

  凭证:
    在桌面版 设置 -> 连接 新建凭证，复制密钥。
    set MOYU_API_KEY=你的密钥
    或者每条命令加 --key 你的密钥

  备忘:
    moyu memos list [--q 关键词] [--limit 50]
    moyu memos get ID
    moyu memos add --title 标题 [--body 正文] [--tags 标签1,标签2] [--url 网址]
    moyu memos update ID [--title ...] [--body ...] [--tags ...] [--url ...] [--pinned]
    moyu memos delete ID

  日记:
    moyu diary list [--from 2026-10-01] [--to 2026-10-31]
    moyu diary get 2026-10-25
    moyu diary put 2026-10-25 --title 标题 --body 正文
    moyu diary delete 2026-10-25

  笔记 / 文件夹:
    moyu notes list [--folder ID] [--q 关键词] [--limit 50]
    moyu notes get ID
    moyu notes add --title 标题 [--body 正文] [--folder ID] [--reference 页码]
    moyu notes update ID [--title ...] [--body ...] [--folder ID] [--reference ...]
    moyu notes delete ID
    moyu folders list
    moyu folders add --name 名字 [--parent ID]
    moyu folders update ID [--name ...] [--parent ID]
    moyu folders delete ID

  计划:
    moyu plans list [--q 关键词] [--limit 50]
    moyu plans get ID
    moyu plans add --title 标题 [--body 正文]
    moyu plans update ID [--title ...] [--body ...]
    moyu plans delete ID

  日程:
    moyu schedule list [--from 2026-10-01] [--to 2026-10-31]
    moyu schedule add --date 2026-10-25 [--time 09:30] --title 标题
      [--notes 备注] [--location 地点] [--remind 10]
    moyu schedule update ID [--date ...] [--time ...] [--title ...]
      [--notes ...] [--location ...] [--remind 10]
    moyu schedule delete ID

  纸篓:
    moyu trash list
    moyu trash restore TYPE ID
    moyu trash purge TYPE ID

  全局参数:
    --key KEY           API 密钥；默认读 MOYU_API_KEY
    --endpoint URL      覆盖本机地址
    --raw               输出服务端原始 JSON
    --help              显示这份帮助

说明:
  - 桌面版必须正在运行（包括收在托盘里）。退出后本地 API 不可用。
  - 只监听 127.0.0.1；密钥只显示一次，丢了就删除重建。
  - 凭证分「读取」和「修改」；修改权限才能增删改。
  - API 不返回密码内容。
  - 默认输出 data 的 JSON，适合直接交给 AI 解析。
'@

$rest = New-Object System.Collections.Generic.List[string]
$endpoint = $null
$key = $env:MOYU_API_KEY
$raw = $false
for ($i = 0; $i -lt $args.Count; $i++) {
  $arg = [string]$args[$i]
  if ($arg -eq '--help' -or $arg -eq '-h') { Write-Output $Help; exit 0 }
  elseif ($arg -eq '--key') { if ($i + 1 -ge $args.Count) { throw '--key 后面要跟密钥' }; $key = [string]$args[++$i] }
  elseif ($arg -eq '--endpoint') { if ($i + 1 -ge $args.Count) { throw '--endpoint 后面要跟地址' }; $endpoint = [string]$args[++$i] }
  elseif ($arg -eq '--raw') { $raw = $true }
  else { $rest.Add($arg) }
}

if ($rest.Count -eq 0) { Write-Output $Help; exit 0 }

function Get-Opt {
  param([string]$Name)
  $index = $rest.IndexOf($Name)
  if ($index -ge 0 -and $index + 1 -lt $rest.Count) { return [string]$rest[$index + 1] }
  return $null
}

function Has-Opt {
  param([string]$Name)
  return $rest.Contains($Name)
}

function Resolve-Endpoint {
  if ($endpoint) { return $endpoint.TrimEnd('/') }
  $infoPath = Join-Path $env:LOCALAPPDATA 'Moyu\api.json'
  if (-not (Test-Path -LiteralPath $infoPath)) {
    throw '找不到本地 API。请先打开摸鱼笔记本（可以收在托盘里）。'
  }
  $info = Get-Content -LiteralPath $infoPath -Raw | ConvertFrom-Json
  if (-not $info.port) { throw '本地 API 信息不完整，请重启摸鱼笔记本。' }
  return "http://127.0.0.1:$($info.port)"
}

$base = Resolve-Endpoint

function Invoke-MoyuApi {
  param([string]$Method, [string]$Path, $Body = $null)
  $uri = $base + $Path
  $request = [System.Net.HttpWebRequest]::Create($uri)
  $request.Method = $Method
  $request.Proxy = $null
  $request.Timeout = 20000
  $request.ReadWriteTimeout = 20000
  if ($key) { $request.Headers.Add('Authorization', "Bearer $key") }
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 20 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $request.ContentType = 'application/json; charset=utf-8'
    $request.ContentLength = $bytes.Length
    $stream = $request.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Dispose()
  }
  try {
    $response = $request.GetResponse()
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $text = $reader.ReadToEnd()
    $reader.Dispose()
    $response.Dispose()
    return $text
  } catch [System.Net.WebException] {
    $response = $_.Exception.Response
    if ($response) {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
      $text = $reader.ReadToEnd()
      $reader.Dispose()
      $response.Dispose()
      $message = $text
      try {
        $errorObj = $text | ConvertFrom-Json
        if ($errorObj.error.message) { $message = [string]$errorObj.error.message }
      } catch { }
      throw $message
    }
    throw $_.Exception.Message
  }
}

function Show-Data {
  param($Data)
  return ConvertTo-Json -InputObject $Data -Depth 30
}

function Body-From {
  param([hashtable]$Fields)
  $clean = @{}
  foreach ($field in $Fields.Keys) {
    $value = $Fields[$field]
    if ($null -ne $value) { $clean[$field] = $value }
  }
  return $clean
}

$command = $rest[0]
$sub = if ($rest.Count -gt 1) { $rest[1] } else { '' }
$id = if ($rest.Count -gt 2) { $rest[2] } else { '' }

if ($command -eq 'health') {
  $rawText = Invoke-MoyuApi -Method GET -Path '/v1/health'
  Write-Output $rawText
  exit 0
}

if (-not $key) {
  throw '没有密钥。设置 MOYU_API_KEY，或加 --key。'
}

try {
  switch ($command) {
    'summary' {
      Show-Data (Invoke-MoyuApi -Method GET -Path '/v1/summary' | ConvertFrom-Json).data
    }
    'memos' {
      if ($sub -eq 'list') {
        $q = Get-Opt '--q'; $limit = Get-Opt '--limit'
        $path = '/v1/memos?'
        if ($q) { $path += 'q=' + [uri]::EscapeDataString($q) + '&' }
        if ($limit) { $path += 'limit=' + [uri]::EscapeDataString($limit) }
        Show-Data (Invoke-MoyuApi -Method GET -Path $path | ConvertFrom-Json).data
      } elseif ($sub -eq 'get') {
        Show-Data (Invoke-MoyuApi -Method GET -Path ('/v1/memos/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } elseif ($sub -eq 'add') {
        $tags = Get-Opt '--tags'
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body'); url = (Get-Opt '--url'); tags = if ($tags) { $tags.Split(',') } else { $null } }
        Show-Data (Invoke-MoyuApi -Method POST -Path '/v1/memos' -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'update') {
        $tags = Get-Opt '--tags'
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body'); url = (Get-Opt '--url'); tags = if ($tags) { $tags.Split(',') } else { $null }; pinned = if (Has-Opt '--pinned') { $true } else { $null } }
        Show-Data (Invoke-MoyuApi -Method PATCH -Path ('/v1/memos/' + [uri]::EscapeDataString($id)) -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'delete') {
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/memos/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } else { throw 'memos 子命令: list / get / add / update / delete' }
    }
    'diary' {
      if ($sub -eq 'list') {
        $from = Get-Opt '--from'; $to = Get-Opt '--to'; $path = '/v1/diaries?'
        if ($from) { $path += 'from=' + [uri]::EscapeDataString($from) + '&' }
        if ($to) { $path += 'to=' + [uri]::EscapeDataString($to) }
        Show-Data (Invoke-MoyuApi -Method GET -Path $path | ConvertFrom-Json).data
      } elseif ($sub -eq 'get') {
        Show-Data (Invoke-MoyuApi -Method GET -Path ('/v1/diaries/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } elseif ($sub -eq 'put') {
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body') }
        Show-Data (Invoke-MoyuApi -Method PUT -Path ('/v1/diaries/' + [uri]::EscapeDataString($id)) -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'delete') {
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/diaries/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } else { throw 'diary 子命令: list / get / put / delete' }
    }
    'notes' {
      if ($sub -eq 'list') {
        $q = Get-Opt '--q'; $folder = Get-Opt '--folder'; $limit = Get-Opt '--limit'; $path = '/v1/notes?'
        if ($q) { $path += 'q=' + [uri]::EscapeDataString($q) + '&' }
        if ($folder) { $path += 'folder=' + [uri]::EscapeDataString($folder) + '&' }
        if ($limit) { $path += 'limit=' + [uri]::EscapeDataString($limit) }
        Show-Data (Invoke-MoyuApi -Method GET -Path $path | ConvertFrom-Json).data
      } elseif ($sub -eq 'get') {
        Show-Data (Invoke-MoyuApi -Method GET -Path ('/v1/notes/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } elseif ($sub -eq 'add') {
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body'); folderId = (Get-Opt '--folder'); reference = (Get-Opt '--reference') }
        Show-Data (Invoke-MoyuApi -Method POST -Path '/v1/notes' -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'update') {
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body'); folderId = (Get-Opt '--folder'); reference = (Get-Opt '--reference') }
        Show-Data (Invoke-MoyuApi -Method PATCH -Path ('/v1/notes/' + [uri]::EscapeDataString($id)) -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'delete') {
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/notes/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } else { throw 'notes 子命令: list / get / add / update / delete' }
    }
    'folders' {
      if ($sub -eq 'list') { Show-Data (Invoke-MoyuApi -Method GET -Path '/v1/folders' | ConvertFrom-Json).data }
      elseif ($sub -eq 'add') {
        $body = Body-From @{ name = (Get-Opt '--name'); parentId = (Get-Opt '--parent') }
        Show-Data (Invoke-MoyuApi -Method POST -Path '/v1/folders' -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'update') {
        $body = Body-From @{ name = (Get-Opt '--name'); parentId = (Get-Opt '--parent') }
        Show-Data (Invoke-MoyuApi -Method PATCH -Path ('/v1/folders/' + [uri]::EscapeDataString($id)) -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'delete') {
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/folders/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } else { throw 'folders 子命令: list / add / update / delete' }
    }
    'plans' {
      if ($sub -eq 'list') {
        $q = Get-Opt '--q'; $limit = Get-Opt '--limit'; $path = '/v1/plans?'
        if ($q) { $path += 'q=' + [uri]::EscapeDataString($q) + '&' }
        if ($limit) { $path += 'limit=' + [uri]::EscapeDataString($limit) }
        Show-Data (Invoke-MoyuApi -Method GET -Path $path | ConvertFrom-Json).data
      } elseif ($sub -eq 'get') {
        Show-Data (Invoke-MoyuApi -Method GET -Path ('/v1/plans/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } elseif ($sub -eq 'add') {
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body') }
        Show-Data (Invoke-MoyuApi -Method POST -Path '/v1/plans' -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'update') {
        $body = Body-From @{ title = (Get-Opt '--title'); body = (Get-Opt '--body') }
        Show-Data (Invoke-MoyuApi -Method PATCH -Path ('/v1/plans/' + [uri]::EscapeDataString($id)) -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'delete') {
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/plans/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } else { throw 'plans 子命令: list / get / add / update / delete' }
    }
    'schedule' {
      if ($sub -eq 'list') {
        $from = Get-Opt '--from'; $to = Get-Opt '--to'; $path = '/v1/schedule?'
        if ($from) { $path += 'from=' + [uri]::EscapeDataString($from) + '&' }
        if ($to) { $path += 'to=' + [uri]::EscapeDataString($to) }
        Show-Data (Invoke-MoyuApi -Method GET -Path $path | ConvertFrom-Json).data
      } elseif ($sub -eq 'add') {
        $remind = Get-Opt '--remind'
        $body = Body-From @{ date = (Get-Opt '--date'); time = (Get-Opt '--time'); title = (Get-Opt '--title'); notes = (Get-Opt '--notes'); location = (Get-Opt '--location'); remind = if ($remind) { [int]$remind } else { $null } }
        Show-Data (Invoke-MoyuApi -Method POST -Path '/v1/schedule' -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'update') {
        $remind = Get-Opt '--remind'
        $body = Body-From @{ date = (Get-Opt '--date'); time = (Get-Opt '--time'); title = (Get-Opt '--title'); notes = (Get-Opt '--notes'); location = (Get-Opt '--location'); remind = if ($remind) { [int]$remind } else { $null } }
        Show-Data (Invoke-MoyuApi -Method PATCH -Path ('/v1/schedule/' + [uri]::EscapeDataString($id)) -Body $body | ConvertFrom-Json).data
      } elseif ($sub -eq 'delete') {
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/schedule/' + [uri]::EscapeDataString($id)) | ConvertFrom-Json).data
      } else { throw 'schedule 子命令: list / add / update / delete' }
    }
    'trash' {
      if ($sub -eq 'list') { Show-Data (Invoke-MoyuApi -Method GET -Path '/v1/trash' | ConvertFrom-Json).data }
      elseif ($sub -eq 'restore') {
        $type = if ($rest.Count -gt 2) { $rest[2] } else { '' }
        $trashId = if ($rest.Count -gt 3) { $rest[3] } else { '' }
        Show-Data (Invoke-MoyuApi -Method POST -Path ('/v1/trash/' + [uri]::EscapeDataString($type) + '/' + [uri]::EscapeDataString($trashId) + '/restore') | ConvertFrom-Json).data
      } elseif ($sub -eq 'purge') {
        $type = if ($rest.Count -gt 2) { $rest[2] } else { '' }
        $trashId = if ($rest.Count -gt 3) { $rest[3] } else { '' }
        Show-Data (Invoke-MoyuApi -Method DELETE -Path ('/v1/trash/' + [uri]::EscapeDataString($type) + '/' + [uri]::EscapeDataString($trashId)) | ConvertFrom-Json).data
      } else { throw 'trash 子命令: list / restore / purge' }
    }
    default { throw "未知命令: $command。运行 moyu --help" }
  }
} catch {
  Write-Output ("ERROR: " + $_.Exception.Message)
  exit 1
}
