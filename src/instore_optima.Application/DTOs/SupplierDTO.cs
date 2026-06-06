using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// DTOs — request/response shapes for the Supplier resource (POST, PUT, GET /api/suppliers).
    namespace instore_optima.Application.DTOs
    {
        // DTO 1 - For creating a new supplier
        public class CreateSupplierDto
        {
            public string Name { get; set; } = string.Empty;
            public string Contact { get; set; } = string.Empty; // contact person's name or phone number
            public string Email { get; set; } = string.Empty;
            public string Address { get; set; } = string.Empty; // physical or mailing address
        }

        // DTO 2 - For updating an existing supplier
        public class UpdateSupplierDto
        {
            public string Name { get; set; } = string.Empty;
            public string Contact { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Address { get; set; } = string.Empty;
        }

        // DTO 3 - For returning supplier data in responses
        public class SupplierResponseDto
        {
            public int SupplierId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Contact { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Address { get; set; } = string.Empty;
        }
    }


