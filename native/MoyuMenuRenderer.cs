using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Moyu;

internal sealed class MoyuMenuColorTable : ProfessionalColorTable
{
    private static readonly Color Paper = Color.FromArgb(251, 248, 241);
    private static readonly Color Hover = Color.FromArgb(232, 238, 231);
    private static readonly Color Line = Color.FromArgb(225, 219, 207);

    public override Color ToolStripDropDownBackground => Paper;
    public override Color ImageMarginGradientBegin => Paper;
    public override Color ImageMarginGradientMiddle => Paper;
    public override Color ImageMarginGradientEnd => Paper;
    public override Color MenuBorder => Line;
    public override Color MenuItemBorder => Color.FromArgb(211, 224, 213);
    public override Color MenuItemSelected => Hover;
    public override Color MenuItemSelectedGradientBegin => Hover;
    public override Color MenuItemSelectedGradientEnd => Hover;
    public override Color SeparatorDark => Line;
    public override Color SeparatorLight => Paper;
    public override Color CheckBackground => Hover;
    public override Color CheckSelectedBackground => Color.FromArgb(220, 231, 222);
}

internal sealed class MoyuMenuRenderer : ToolStripProfessionalRenderer
{
    private static readonly Color Text = Color.FromArgb(52, 58, 52);
    private static readonly Color Disabled = Color.FromArgb(158, 158, 150);
    private static readonly Color Accent = Color.FromArgb(79, 107, 93);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateRoundRectRgn(int left, int top, int right, int bottom, int width, int height);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr handle);

    public MoyuMenuRenderer() : base(new MoyuMenuColorTable())
    {
        RoundedEdges = false;
    }

    public static void StyleMenu(ContextMenuStrip menu)
    {
        menu.RenderMode = ToolStripRenderMode.Professional;
        menu.Renderer = new MoyuMenuRenderer();
        menu.ShowImageMargin = false;
        menu.ShowCheckMargin = true;
        menu.BackColor = Color.FromArgb(251, 248, 241);
        menu.ForeColor = Text;
        menu.Font = new Font("Microsoft YaHei UI", 9F);
        menu.Padding = new Padding(6, 6, 6, 6);
        menu.DropShadowEnabled = true;
        menu.AutoSize = true;
        menu.MinimumSize = new Size(224, 0);
        menu.Opening += (_, _) => ApplyRoundedRegion(menu);
        menu.SizeChanged += (_, _) =>
        {
            if (menu.Visible) ApplyRoundedRegion(menu);
        };
    }

    public static void StyleItems(ToolStripItemCollection items)
    {
        foreach (ToolStripItem item in items)
        {
            if (item is ToolStripSeparator)
            {
                item.Margin = new Padding(6, 4, 6, 4);
                continue;
            }

            var bold = item.Font.Bold;
            item.Font = new Font("Microsoft YaHei UI", 9F, bold ? FontStyle.Bold : FontStyle.Regular);
            item.Padding = new Padding(10, 5, 14, 5);
            item.Margin = new Padding(0, 1, 0, 1);
        }
    }

    private static void ApplyRoundedRegion(ContextMenuStrip menu)
    {
        if (menu.Width <= 0 || menu.Height <= 0) return;
        var handle = CreateRoundRectRgn(0, 0, menu.Width + 1, menu.Height + 1, 12, 12);
        if (handle == IntPtr.Zero) return;
        try
        {
            var rounded = Region.FromHrgn(handle);
            var old = menu.Region;
            menu.Region = rounded;
            old?.Dispose();
        }
        catch
        {
            // The default rectangular region is still usable.
        }
        finally
        {
            DeleteObject(handle);
        }
    }

    protected override void OnRenderToolStripBackground(ToolStripRenderEventArgs e)
    {
        using var brush = new SolidBrush(Color.FromArgb(251, 248, 241));
        e.Graphics.FillRectangle(brush, e.AffectedBounds);
    }

    protected override void OnRenderToolStripBorder(ToolStripRenderEventArgs e)
    {
        using var path = RoundedRectangle(new Rectangle(0, 0, e.ToolStrip.Width - 1, e.ToolStrip.Height - 1), 10);
        using var pen = new Pen(Color.FromArgb(222, 216, 204));
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.DrawPath(pen, path);
    }

    protected override void OnRenderMenuItemBackground(ToolStripItemRenderEventArgs e)
    {
        var item = e.Item;
        if (!item.Selected && !item.Pressed) return;

        var bounds = new Rectangle(4, 1, Math.Max(0, item.Width - 8), Math.Max(0, item.Height - 2));
        if (bounds.Width <= 0 || bounds.Height <= 0) return;
        using var path = RoundedRectangle(bounds, 6);
        using var brush = new SolidBrush(item.Enabled
            ? Color.FromArgb(232, 238, 231)
            : Color.FromArgb(241, 238, 230));
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.FillPath(brush, path);
    }

    protected override void OnRenderItemText(ToolStripItemTextRenderEventArgs e)
    {
        e.TextColor = e.Item.Enabled ? Text : Disabled;
        base.OnRenderItemText(e);
    }

    protected override void OnRenderSeparator(ToolStripSeparatorRenderEventArgs e)
    {
        var y = e.Item.Height / 2;
        using var pen = new Pen(Color.FromArgb(228, 222, 210));
        e.Graphics.DrawLine(pen, 12, y, Math.Max(12, e.Item.Width - 12), y);
    }

    protected override void OnRenderItemCheck(ToolStripItemImageRenderEventArgs e)
    {
        var r = e.ImageRectangle;
        if (r.Width <= 0 || r.Height <= 0) return;
        var center = new Point(r.Left + r.Width / 2, r.Top + r.Height / 2);
        using var brush = new SolidBrush(Color.FromArgb(79, 107, 93));
        using var pen = new Pen(Color.FromArgb(251, 248, 241), 1.7f)
        {
            StartCap = LineCap.Round,
            EndCap = LineCap.Round
        };
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        e.Graphics.FillEllipse(brush, center.X - 6, center.Y - 6, 12, 12);
        e.Graphics.DrawLines(pen, new[]
        {
            new Point(center.X - 3, center.Y),
            new Point(center.X - 1, center.Y + 2),
            new Point(center.X + 4, center.Y - 3)
        });
    }

    private static GraphicsPath RoundedRectangle(Rectangle bounds, int radius)
    {
        var path = new GraphicsPath();
        var d = radius * 2;
        path.AddArc(bounds.X, bounds.Y, d, d, 180, 90);
        path.AddArc(bounds.Right - d, bounds.Y, d, d, 270, 90);
        path.AddArc(bounds.Right - d, bounds.Bottom - d, d, d, 0, 90);
        path.AddArc(bounds.X, bounds.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }
}
