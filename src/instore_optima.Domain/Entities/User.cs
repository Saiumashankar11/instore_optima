using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace instore_optima.Domain.Entities
{
    // DB Entity — a person who can log in to the system.
    // Roles control what actions the user is allowed to perform (e.g. Admin can manage users;
    // Manager can approve replenishments; Staff can view stock and place orders).
    public class User
    {
        public int UserId { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }    // stored as a hashed value — never plain text
        public string Role { get; set; }        // access level: "Admin", "Manager", or "Staff"
        public DateTime CreatedAt { get; set; } // when the account was registered
        public bool TotpEnabled { get; set; } = false; // true if the user has set up a TOTP authenticator app (e.g. Google Authenticator)
        public string? TotpSecret { get; set; }        // base-32 secret key used to generate/verify TOTP codes; null if TOTP is not set up
        public string? PhoneNumber { get; set; }       // optional contact phone number; used for display only
        public string? Address { get; set; }           // optional mailing address; used for display only
    }
}
