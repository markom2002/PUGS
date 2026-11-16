using System.Globalization;
using System.Text;
namespace BE.Arena;

public record ArenaQuestion(string Text, string[] Answers, string Category, string? AudioUrl = null, string? Artist = null);
public static class QuestionBank
{
    public static string Normalize(string text) => string.Concat(text.Trim().ToLowerInvariant().Replace("đ", "dj").Normalize(NormalizationForm.FormD).Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark && char.IsLetterOrDigit(c)));
    static ArenaQuestion[] Pack(string category, params string[] rows) => rows.Select(row => { var parts = row.Split('~'); return new ArenaQuestion(parts[0], parts[1].Split('|'), category); }).ToArray();
    public static readonly Dictionary<string, ArenaQuestion[]> Categories = new()
    {
        ["Geografija"] = Pack("Geografija", "Koji je glavni grad Portugala?~Lisabon", "Koja je najveća država po površini?~Rusija", "Koja rijeka protiče kroz Mostar?~Neretva", "Na kom kontinentu je Argentina?~Južna Amerika", "Koji okean je najveći?~Tihi okean|Pacifik"),
        ["Sport"] = Pack("Sport", "Koliko igrača jednog tima počinje fudbalsku utakmicu?~11|jedanaest", "Na kojoj podlozi se igra Wimbledon?~Trava|travi", "U kom sportu se koristi pak?~Hokej|hokej na ledu", "Koliko krugova ima olimpijski simbol?~5|pet", "Koja zemlja je osvojila SP u fudbalu 2022?~Argentina"),
        ["Film i serije"] = Pack("Film i serije", "Kako se preziva čarobnjak Harry iz knjiga J. K. Rowling?~Potter|Poter", "Ko je režirao Titanic iz 1997?~James Cameron|Džejms Kameron|Cameron|Kameron", "Kako se zove grad u kojem živi Batman?~Gotham|Gotam", "Koja filmska nagrada ima zlatnu statuetu viteza?~Oscar|Oskar", "Kako se zove hobit koji nosi Prsten do Mordora?~Frodo|Frodo Baggins|Frodo Bagins"),
        ["Nauka"] = Pack("Nauka", "Koja planeta je poznata kao crvena planeta?~Mars", "Koji element ima simbol O?~Kiseonik|Kisik", "Koliko kostiju tipično ima odrasli čovjek?~206", "Koja sila nas drži na površini Zemlje?~Gravitacija|gravitaciona sila", "Koja je hemijska formula vode?~H2O"),
        ["Istorija"] = Pack("Istorija", "Koje godine je pao Berlinski zid?~1989", "Koji grad je bio središte Rimskog carstva?~Rim", "Koji moreplovac je 1492. stigao do Amerike?~Kristofor Kolumbo|Kolumbo|Christopher Columbus", "Koje godine je završen Drugi svjetski rat?~1945", "Kako se zove drevno pismo sa znacima u obliku klina?~Klinasto|klinasto pismo"),
        ["Tehnologija"] = Pack("Tehnologija", "Koji brojni sistem koristi samo 0 i 1?~Binarni|binarni sistem", "Kako se zove fizički dio računara?~Hardver|hardware", "Koji jezik daje strukturu web stranici?~HTML", "Koja kompanija pravi PlayStation?~Sony|Soni", "Koja skraćenica označava centralni procesor?~CPU"),
        ["Umjetnost"] = Pack("Umjetnost", "Ko je naslikao Mona Lizu?~Leonardo da Vinci|Leonardo da Vinči|Da Vinci", "Koji instrument ima crne i bijele dirke?~Klavir|piano", "Ko je napisao Hamleta?~William Shakespeare|Vilijam Šekspir|Šekspir|Shakespeare", "Kako se zove japanska umjetnost savijanja papira?~Origami", "Ko je naslikao Zvjezdanu noć?~Vincent van Gogh|Vinsent van Gog|Van Gogh|Van Gog"),
        ["Priroda"] = Pack("Priroda", "Koja je najveća životinja na Zemlji?~Plavi kit", "Koji proces biljkama omogućava stvaranje hrane uz svjetlost?~Fotosinteza", "Koliko nogu imaju insekti?~6|šest", "Koji je najtvrđi prirodni mineral?~Dijamant", "Kako se zove nauka o pticama?~Ornitologija")
    };
    public static readonly ArenaQuestion[][] Chains = {
        Pack("Kaladont", "Koja planeta je poznata po svojim prstenovima?~Saturn", "Koja rijeka protiče kroz Mostar?~Neretva", "Kako se zove kontinent na kojem je Egipat?~Afrika", "Kako se zove najveća prašuma na svijetu?~Amazonija", "Koji grčki bog je bog rata?~Ares"),
        Pack("Kaladont", "Koji je glavni grad Italije?~Rim", "Kako se zove crvena planeta?~Mars", "Koji je glavni grad Bosne i Hercegovine?~Sarajevo", "Kako se zove jezero na čijoj obali je grad Ohrid?~Ohridsko", "Kako se zove nauka o pticama?~Ornitologija"),
        Pack("Kaladont", "Koji je glavni grad Norveške?~Oslo", "Kako se zove japanska umjetnost savijanja papira?~Origami", "Koja država ima glavni grad Bagdad?~Irak", "Koji instrument ima crne i bijele dirke?~Klavir", "Koji je glavni grad Italije?~Rim")
    };
}
