using System;
using System.Drawing;
using System.Windows.Forms;

namespace SpeakIt.Tests.TestTarget
{
    public class TargetForm : Form
    {
        public TextBox NormalBox;
        public TextBox PasswordBox;
        public RichTextBox RichBox;

        public TargetForm()
        {
            Text = "SpeakIt-TestTarget-Window";
            Size = new Size(400, 300);

            NormalBox = new TextBox
            {
                Name = "NormalBox",
                Location = new Point(20, 20),
                Size = new Size(340, 24),
                Text = "Initial"
            };

            PasswordBox = new TextBox
            {
                Name = "PasswordBox",
                Location = new Point(20, 60),
                Size = new Size(340, 24),
                UseSystemPasswordChar = true
            };

            RichBox = new RichTextBox
            {
                Name = "RichBox",
                Location = new Point(20, 100),
                Size = new Size(340, 140)
            };

            Controls.Add(NormalBox);
            Controls.Add(PasswordBox);
            Controls.Add(RichBox);
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.Run(new TargetForm());
        }
    }
}
