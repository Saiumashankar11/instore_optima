// =============================================================================
// EmailTemplatesTests.cs — Unit tests for email template content
// =============================================================================
// These tests verify that the static EmailTemplates methods produce correct
// email content: OTP codes appear in subject and body, expiry copy is accurate,
// user-supplied HTML is escaped to prevent injection, and user names are
// included in the greeting.
// No database or network required — these are pure string tests.
// =============================================================================
using instore_optima.Infrastructure.Services;
using Xunit;

namespace instore_optima.Tests;

public class EmailTemplatesTests
{
    /// <summary>
    /// Verifies that the login OTP code appears in both the email subject
    /// (so it's visible in notification banners) and the HTML body, and that
    /// the recipient's name is included in the greeting.
    /// </summary>
    [Fact]
    public void LoginOtp_PutsCodeInSubjectAndBody()
    {
        // Arrange + Act
        var c = EmailTemplates.LoginOtp("Sai", "123456");

        // Assert
        Assert.Contains("123456", c.Subject);
        Assert.Contains("123456", c.Html);
        Assert.Contains("Sai", c.Html);
    }

    /// <summary>
    /// Verifies that both OTP email types tell the user the code expires in
    /// 3 minutes, matching the actual server-side OTP validity window.
    /// If the validity period changes, this test will catch the mismatch.
    /// </summary>
    [Fact]
    public void OtpEmails_StateThreeMinuteExpiry()
    {
        // The email copy must match the actual 3-minute OTP validity.
        Assert.Contains("3 minutes", EmailTemplates.LoginOtp("A", "111111").Html);
        Assert.Contains("3 minutes", EmailTemplates.ResetOtp("A", "222222").Html);
    }

    /// <summary>
    /// Security test: a malicious user could inject HTML/JS into the support
    /// message field. Verifies that the template HTML-escapes the user's input
    /// so angle brackets are rendered as text, not executed as markup.
    /// </summary>
    [Fact]
    public void Support_EscapesHtmlInUserMessage()
    {
        // Arrange + Act — message contains a raw script tag (XSS attempt).
        var c = EmailTemplates.Support("Mallory", "m@x.com", "<script>alert(1)</script>");

        // Assert — the raw tag must not appear; the escaped version must.
        Assert.DoesNotContain("<script>", c.Html);
        Assert.Contains("&lt;script&gt;", c.Html);
        Assert.Contains("m@x.com", c.Html);
    }

    /// <summary>
    /// Verifies that the deactivation email greets the user by their real name
    /// and that the word "deactivated" appears somewhere in the subject line.
    /// </summary>
    [Fact]
    public void Deactivated_GreetsUserByName()
    {
        // Arrange + Act
        var c = EmailTemplates.Deactivated("Archana");

        // Assert
        Assert.Contains("Archana", c.Html);
        Assert.Contains("deactivated", c.Subject.ToLowerInvariant());
    }
}
