; Moyu Notebook - per-user Windows installer
; Build with tools\build-release.ps1 (Inno Setup 6.5+).

#ifndef MyAppVersion
  #define MyAppVersion "3.3.0"
#endif

#ifndef MySource
  #define MySource "..\..\dist\release\app"
#endif

#define MyAppName "摸鱼笔记本"
#define MyAppExe "Moyu.exe"
#define MyAppPublisher "Moyu"
#define MyAppURL "https://github.com/Tea-2026"

[Setup]
AppId={{48766FFE-7329-44CC-8223-2F766D10C1B8}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\Moyu
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableDirPage=no
UsePreviousAppDir=yes
AllowNoIcons=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
OutputDir=..\..\dist\release
OutputBaseFilename=Moyu-{#MyAppVersion}-win-x64-setup
SetupIconFile=..\..\icons\app.ico
UninstallDisplayIcon={app}\{#MyAppExe}
UninstallDisplayName={#MyAppName}
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes
WizardStyle=modern
WizardSizePercent=110
CloseApplications=yes
RestartApplications=no
AppMutex=Local\Moyu.SingleInstance
ChangesEnvironment=yes
SetupLogging=yes
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} installer
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
ShowLanguageDialog=auto

[Languages]
Name: "chinesesimplified"; MessagesFile: "ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "addtopath"; Description: "把 moyu 命令加入 PATH（新开终端生效）"; GroupDescription: "命令行"; Flags: checkedonce

[Files]
Source: "{#MySource}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExe}"; WorkingDir: "{app}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"

[Run]
Filename: "{app}\{#MyAppExe}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
const
  WebView2Guid = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

function GetWebView2Version(): String;
var
  Version: String;
begin
  Result := '';
  if RegQueryStringValue(HKLM, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', Version) then
    Result := Version
  else if RegQueryStringValue(HKLM, 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', Version) then
    Result := Version
  else if RegQueryStringValue(HKCU, 'Software\Microsoft\EdgeUpdate\Clients\' + WebView2Guid, 'pv', Version) then
    Result := Version;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if (GetWebView2Version() = '') and (not WizardSilent) then
  begin
    if MsgBox('没有检测到 Microsoft Edge WebView2 Runtime。' + #13#10 + #13#10 +
      '摸鱼笔记本需要它才能显示界面。可以先继续安装，然后从微软官网安装 WebView2 Runtime。' + #13#10 +
      'https://go.microsoft.com/fwlink/p/?LinkId=2124703' + #13#10 + #13#10 +
      '仍然继续吗？', mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;

procedure AddToUserPath();
var
  Path: String;
  AppDir: String;
begin
  AppDir := ExpandConstant('{app}');
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', Path) then
    Path := '';
  if Pos(';' + AppDir + ';', ';' + Path + ';') = 0 then
  begin
    if Path = '' then
      Path := AppDir
    else
      Path := Path + ';' + AppDir;
    RegWriteExpandStringValue(HKCU, 'Environment', 'Path', Path);
  end;
end;

procedure RemoveFromUserPath();
var
  Path: String;
  AppDir: String;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', Path) then
    Exit;
  AppDir := ExpandConstant('{app}');
  Path := ';' + Path + ';';
  StringChangeEx(Path, ';' + AppDir + ';', ';', True);
  while Pos(';;', Path) > 0 do
    StringChangeEx(Path, ';;', ';', True);
  if (Length(Path) > 0) and (Path[1] = ';') then
    Delete(Path, 1, 1);
  if (Length(Path) > 0) and (Path[Length(Path)] = ';') then
    Delete(Path, Length(Path), 1);
  RegWriteExpandStringValue(HKCU, 'Environment', 'Path', Path);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if WizardIsTaskSelected('addtopath') then
      AddToUserPath();
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    RemoveFromUserPath();
end;
