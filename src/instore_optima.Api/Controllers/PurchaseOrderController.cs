using instore_optima.Domain.Entities;
using instore_optima.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using instore_optima.Application.DTOs;
using instore_optima.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace instore_optima.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseOrderController : ControllerBase
    {
        private readonly IPurchaseOrderRepository _purchaseOrderRepository;

        public PurchaseOrderController(IPurchaseOrderRepository purchaseOrderRepository)
        {
            _purchaseOrderRepository = purchaseOrderRepository;
        }

        // GET api/purchaseorder
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _purchaseOrderRepository.GetAllPurchaseOrdersAsync();
            return Ok(orders);
        }

        // GET api/purchaseorder/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var po = await _purchaseOrderRepository.GetPOByIdAsync(id);
            if (po == null) return NotFound();
            return Ok(po);
        }

        // POST api/purchaseorder
        [HttpPost]
        public async Task<IActionResult> Create(CreatePurchaseOrderDto dto)
        {
            if (dto.SupplierId <= 0)
                return BadRequest("SupplierId is required");

            if (dto.ReplenishmentOrderId <= 0)
                return BadRequest("ReplenishmentOrderId is required");

            var po = new instore_optima.Domain.Entities.PurchaseOrder
            {
                SupplierId = dto.SupplierId,
                ReplenishmentOrderId = dto.ReplenishmentOrderId,
                IssuedAt = dto.IssuedAt,
                ExpectedDeliveryDate = dto.ExpectedDeliveryDate,
                Status = "Pending"
            };

            var created = await _purchaseOrderRepository.CreatePurchaseOrderAsync(po);
            return CreatedAtAction(nameof(GetById), new { id = created.PurchaseOrderId }, created);
        }

        // PUT api/purchaseorder/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStatus(int id, UpdatePurchaseOrderDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Status))
                return BadRequest("Status is required");

            var validStatuses = new[] { "Pending", "Delivered", "Cancelled" };
            if (!validStatuses.Contains(dto.Status))
                return BadRequest("Status must be Pending, Delivered or Cancelled");

            var po = await _purchaseOrderRepository.GetPOByIdAsync(id);
            if (po == null) return NotFound();

            var updated = await _purchaseOrderRepository.UpdatePOStatusAsync(id, dto.Status);
            return Ok(updated);
        }
    }
}
