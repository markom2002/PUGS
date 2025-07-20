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
                .ForMember(dest => dest.Points, opt => opt.MapFrom(src => src.Points));

            CreateMap<CreateResultDto, Result>()
                .ForMember(dest => dest.Points, opt => opt.MapFrom(src => src.Points));
        }
    }
}
