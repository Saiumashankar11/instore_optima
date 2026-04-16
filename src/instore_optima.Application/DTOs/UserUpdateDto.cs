using System;   
namespace Application.DTOs.UserDTOs
{
    public class UserUpdateDto
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
    }
}