using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

    namespace instore_optima.Application.DTOs
    {
        // DTO 1 - For creating a new supplier
        public class CreateSupplierDto
        {
            public string Name { get; set; } = string.Empty;
            public string Contact { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Address { get; set; } = string.Empty;
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


