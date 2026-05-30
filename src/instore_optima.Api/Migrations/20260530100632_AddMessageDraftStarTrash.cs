using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace instore_optima.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageDraftStarTrash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bcc",
                table: "InternalMessages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cc",
                table: "InternalMessages",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDraft",
                table: "InternalMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsStarredByReceiver",
                table: "InternalMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsStarredBySender",
                table: "InternalMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ScheduledAt",
                table: "InternalMessages",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TrashedByReceiver",
                table: "InternalMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "TrashedBySender",
                table: "InternalMessages",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bcc",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "Cc",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "IsDraft",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "IsStarredByReceiver",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "IsStarredBySender",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "ScheduledAt",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "TrashedByReceiver",
                table: "InternalMessages");

            migrationBuilder.DropColumn(
                name: "TrashedBySender",
                table: "InternalMessages");
        }
    }
}
