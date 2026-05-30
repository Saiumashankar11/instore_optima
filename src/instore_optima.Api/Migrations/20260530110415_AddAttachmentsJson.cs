using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace instore_optima.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAttachmentsJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentsJson",
                table: "InternalMessages",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentsJson",
                table: "InternalMessages");
        }
    }
}
