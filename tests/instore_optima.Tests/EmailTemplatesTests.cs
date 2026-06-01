using instore_optima.Infrastructure.Services;
using Xunit;

namespace instore_optima.Tests;

public class EmailTemplatesTests
{
    [Fact]
    public void LoginOtp_PutsCodeInSubjectAndBody()
    {
        var c = EmailTemplates.LoginOtp("Sai", "123456");

        Assert.Contains("123456", c.Subject);
        Assert.Contains("123456", c.Html);
        Assert.Contains("Sai", c.Html);
    }

    [Fact]
    public void OtpEmails_StateThreeMinuteExpiry()
    {
        // The email copy must match the actual 3-minute OTP validity.
        Assert.Contains("3 minutes", EmailTemplates.LoginOtp("A", "111111").Html);
        Assert.Contains("3 minutes", EmailTemplates.ResetOtp("A", "222222").Html);
    }

    [Fact]
    public void Support_EscapesHtmlInUserMessage()
    {
        var c = EmailTemplates.Support("Mallory", "m@x.com", "<script>alert(1)</script>");

        Assert.DoesNotContain("<script>", c.Html);
        Assert.Contains("&lt;script&gt;", c.Html);
        Assert.Contains("m@x.com", c.Html);
    }

    [Fact]
    public void Deactivated_GreetsUserByName()
    {
        var c = EmailTemplates.Deactivated("Archana");

        Assert.Contains("Archana", c.Html);
        Assert.Contains("deactivated", c.Subject.ToLowerInvariant());
    }
}
