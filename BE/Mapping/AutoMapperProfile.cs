using AutoMapper;
using BE.Dtos;
using BE.Models;

namespace BE.Mapping
{
    public class AutoMapperProfile : Profile
    {
        public AutoMapperProfile()
        {
            CreateMap<Option, OptionDto>().ReverseMap();
            CreateMap<Question, QuestionDto>().ReverseMap();
            CreateMap<Quiz, QuizDto>().ReverseMap();
        }
    }
}
