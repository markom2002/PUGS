using AutoMapper;
using BE.Models;
using BE.Dtos.Results;

namespace BE.Mapping
{
    public class ResultProfile : Profile
    {
        public ResultProfile()
        {
            CreateMap<Result, ResultViewDto>()
                .ForMember(dest => dest.QuizTitle, opt => opt.MapFrom(src => src.Quiz.Title));

            CreateMap<CreateResultDto, Result>();
        }
    }
}
