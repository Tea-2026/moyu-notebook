# 摸鱼笔记本 CLI / 本地 API

给 AI 或脚本用的本机接口。只监听 `127.0.0.1`，不经过网络。

## 先建凭证

1. 打开桌面版，设置 → **连接**。
2. 填名字，勾选权限：
   - **读取**：查数据。
   - **修改**：增、删、改。
3. 点「创建凭证」。密钥会显示出来，可以复制；之后在列表里点「复制」也能再取。
4. 密钥用 Windows DPAPI 按当前 Windows 用户加密保存，不存明文；换 Windows 账户 / 换机器后旧密钥文件无法解密，删除重建即可。名字可以随时改，密钥本身不能改。

凭证文件在 `%LOCALAPPDATA%\Moyu\credentials.json`，只存 SHA-256 哈希、DPAPI 密文和前缀，不存明文密钥。密钥是 40 位 `A-Za-z0-9`，停用或删除后立刻失效。

## CLI

桌面版运行后（可以收在托盘里）：

```powershell
$env:MOYU_API_KEY = "你的密钥"
moyu --help
moyu summary
moyu notes list --limit 20
moyu notes add --title "今天的摘录" --body "..." --folder 文件夹ID
moyu plans add --title "十一月计划" --body "..."
moyu schedule list --from 2026-10-01 --to 2026-10-31
```

如果安装时没把 `D:\App\Moyu` 加进 PATH：

```powershell
D:\App\Moyu\moyu --help
```

也可以每条命令用 `--key`：

```powershell
moyu summary --key 你的密钥
```

CLI 默认输出 `data` 的 JSON，适合给 AI 解析。`--raw` 输出完整响应。

### 常用命令

```text
moyu summary
moyu memos list|get|add|update|delete
moyu diary list|get|put|delete
moyu notes list|get|add|update|delete
moyu folders list|add|update|delete
moyu plans list|get|add|update|delete
moyu schedule list|add|update|delete
moyu trash list|restore|purge
```

`moyu --help` 有完整参数。

## HTTP API

地址从 `%LOCALAPPDATA%\Moyu\api.json` 读取：

```json
{ "app": "moyu", "port": 47821, "pid": 1234 }
```

```http
GET http://127.0.0.1:47821/v1/summary
Authorization: Bearer 你的密钥
```

响应：

```json
{ "ok": true, "data": { "memos": 3, "diaries": 2, "notes": 8, "folders": 4, "schedule": 5, "trash": 0 } }
```

错误：

```json
{ "ok": false, "error": { "code": "unauthorized", "message": "凭证无效、已停用或已删除" } }
```

状态码：`200` / `201`、`400`、`401`、`403`、`404`、`409`、`423`（本机上锁）、`500`、`503`（还在加载）、`504`。

### 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/v1/health` | 不需要密钥，确认服务在 |
| GET | `/v1/summary` | 各类数量 |
| GET | `/v1/memos?q=&limit=` | 备忘 / 网站 / 密码元数据；不返回密码 |
| GET | `/v1/memos/{id}` | 单条 |
| POST | `/v1/memos` | `{title,body,tags,url}` |
| PATCH | `/v1/memos/{id}` | 改 `title,body,tags,url,pinned` |
| DELETE | `/v1/memos/{id}` | 移到纸篓 |
| GET | `/v1/diaries?from=&to=` | 日记列表 |
| GET | `/v1/diaries/{date}` | 某天，`date=YYYY-MM-DD` |
| PUT | `/v1/diaries/{date}` | 新建 / 覆盖当天 `{title,body}` |
| DELETE | `/v1/diaries/{date}` | 移到纸篓 |
| GET | `/v1/notes?folder=&q=&limit=` | 笔记；`folder` 可用 `all` / `unfiled` / 文件夹 ID |
| GET | `/v1/notes/{id}` | 单条 |
| POST | `/v1/notes` | `{title,body,reference,folderId}` |
| PATCH | `/v1/notes/{id}` | 改上述字段 |
| DELETE | `/v1/notes/{id}` | 移到纸篓 |
| GET | `/v1/folders` | 扁平文件夹列表，带 `path` |
| POST | `/v1/folders` | `{name,parentId}` |
| PATCH | `/v1/folders/{id}` | `{name,parentId}` |
| DELETE | `/v1/folders/{id}` | 删文件夹，笔记移到上一级 |
| GET | `/v1/plans?q=&limit=` | 计划列表 |
| GET | `/v1/plans/{id}` | 单个计划 |
| POST | `/v1/plans` | `{title,body}` |
| PATCH | `/v1/plans/{id}` | 改 `title,body` |
| DELETE | `/v1/plans/{id}` | 移到纸篓 |
| GET | `/v1/schedule?from=&to=` | 日程 |
| GET | `/v1/schedule/{id}` | 单条 |
| POST | `/v1/schedule` | `{date,time,title,notes,location,remind}`；`time` 空就是全天 |
| PATCH | `/v1/schedule/{id}` | 改上述字段 |
| DELETE | `/v1/schedule/{id}` | 移到纸篓 |
| GET | `/v1/trash` | 纸篓 |
| POST | `/v1/trash/{type}/{id}/restore` | `type`: `memo` / `diary` / `note` / `plan` / `schedule` |
| DELETE | `/v1/trash/{type}/{id}` | 彻底删除 |

写操作成功后，桌面版界面会刷新，数据走原来的保存 / 自动备份流程。

## 安全边界

- 服务只绑定 `127.0.0.1`，程序退出即停止。
- 密钥不存明文：校验用 SHA-256 哈希，复制用 Windows DPAPI 密文；停用 / 删除立即生效。
- 读凭证不能写；写凭证可以写，但不会返回密码内容。
- 密码记录只返回标题、账号、网址等元数据，`password` 字段不会出现在 API 响应里。
- 库上锁时 API 返回 `423`，不会绕开密码锁。
- 本地 API 不是云同步，不会把数据发到外网。
- 纸篓里的内容仍然可被有 `write` 权限的凭证永久删除；给 AI 写权限前想清楚。
- 不要把密钥写进公开的提示词、仓库或截图。用环境变量 `MOYU_API_KEY`。

## 给 AI 的一段说明

```text
你可以用本机的 `moyu` 命令操作我的摸鱼笔记本。
先运行 `moyu --help` 看命令；密钥在环境变量 MOYU_API_KEY 里。
读取用 `moyu summary`、`moyu notes list` 等；
修改前先读取并确认 ID；删除是移到纸篓，不是永久删除；
不要把密码、密钥或导出内容写到公开的地方。
所有输出都是 JSON。
```
