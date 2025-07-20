namespace BE.Dtos
{
    public class QuizDetailsDto : QuizDto
    {
        public List<QuestionDto> Questions { get; set; } = new();
    }
}
