using Microsoft.EntityFrameworkCore;
using BE.Models;
using BE.Models.QuizHub; // importuj svoje modele

namespace BE
{
    public class AppContext : DbContext
    {
        public AppContext(DbContextOptions<AppContext> options) : base(options)
        {
        }

        
        public DbSet<User> Users { get; set; }
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<Question> Questions { get; set; }
        public DbSet<Option> Options { get; set; }

        public DbSet<Result> Results { get; set; }

        public DbSet<Answer> Answers { get; set; }

        public DbSet<LiveQuizRoom> LiveQuizRooms { get; set; }

        public DbSet<LiveQuizParticipant> LiveQuizParticipants { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Option>()
                .HasOne(o => o.Question)
                .WithMany(q => q.Options)
                .HasForeignKey(o => o.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Answer>()
                .HasOne(a => a.Result)
                .WithMany(r => r.Answers)
                .HasForeignKey(a => a.ResultId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Answer>()
                .HasOne(a => a.Question)
                .WithMany()
                .HasForeignKey(a => a.QuestionId)
                .OnDelete(DeleteBehavior.Restrict);

            //Konfiguracija za Live sobu
            modelBuilder.Entity<LiveQuizParticipant>()
                .HasOne(p => p.Room)
                .WithMany(r => r.Participants)
                .HasForeignKey(p => p.RoomId)
                .OnDelete(DeleteBehavior.Cascade);


        }

    }
}
