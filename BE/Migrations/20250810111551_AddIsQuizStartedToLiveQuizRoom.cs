using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddIsQuizStartedToLiveQuizRoom : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsQuizStarted",
                table: "LiveQuizRooms",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_LiveQuizRooms_QuizId",
                table: "LiveQuizRooms",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_LiveQuizParticipants_UserId",
                table: "LiveQuizParticipants",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_LiveQuizParticipants_Users_UserId",
                table: "LiveQuizParticipants",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LiveQuizRooms_Quizzes_QuizId",
                table: "LiveQuizRooms",
                column: "QuizId",
                principalTable: "Quizzes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LiveQuizParticipants_Users_UserId",
                table: "LiveQuizParticipants");

            migrationBuilder.DropForeignKey(
                name: "FK_LiveQuizRooms_Quizzes_QuizId",
                table: "LiveQuizRooms");

            migrationBuilder.DropIndex(
                name: "IX_LiveQuizRooms_QuizId",
                table: "LiveQuizRooms");

            migrationBuilder.DropIndex(
                name: "IX_LiveQuizParticipants_UserId",
                table: "LiveQuizParticipants");

            migrationBuilder.DropColumn(
                name: "IsQuizStarted",
                table: "LiveQuizRooms");
        }
    }
}
