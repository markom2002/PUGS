using AutoMapper;
using BE.Dtos;
using BE.Dtos.QuizHub;
using BE.Models;
using BE.Models.QuizHub;

namespace BE.Mapping
{
    public class AutoMapperProfile : Profile
    {
        public AutoMapperProfile()
        {
            CreateMap<Option, OptionDto>().ReverseMap();
            CreateMap<Question, QuestionDto>()
                .ForMember(dest => dest.CorrectTextAnswer, opt => opt.MapFrom(src => src.CorrectTextAnswer))
                .ReverseMap();

            CreateMap<Quiz, QuizDto>().ReverseMap();

            CreateMap<LiveQuizParticipant, LiveQuizParticipantDto>()
                .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User.Username));


        }
    }
}
