using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace instore_optima.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddActionFieldsToInternalMessage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActionPayload",
                table: "InternalMessages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActionType",
                table: "InternalMessages",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActionPayload",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "ActionType",
                table: "InternalMessages");
        }
    }
}
