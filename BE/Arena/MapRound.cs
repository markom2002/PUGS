using System.Text.Json;
namespace BE.Arena;

public record GeoPoint(double Latitude, double Longitude);
public record MapLocation(string Label, string Country, double Latitude, double Longitude);

public static class MapRound
{
    public static readonly ArenaQuestion[] Questions = Load();

    static ArenaQuestion[] Load()
    {
        var relative = Path.Combine("Arena", "Data", "map-questions.json");
        var path = new[] { Path.Combine(System.AppContext.BaseDirectory, relative),
            Path.Combine(Directory.GetCurrentDirectory(), relative),
            Path.Combine(Directory.GetCurrentDirectory(), "BE", relative) }.First(File.Exists);
        return JsonSerializer.Deserialize<ArenaQuestion[]>(File.ReadAllText(path),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    public static bool Valid(GeoPoint point) => double.IsFinite(point.Latitude) && double.IsFinite(point.Longitude)
        && point.Latitude >= -90 && point.Latitude <= 90 && point.Longitude >= -180 && point.Longitude <= 180;

    public static double DistanceKm(GeoPoint a, GeoPoint b)
    {
        if (!Valid(a) || !Valid(b)) throw new InvalidOperationException("Označi važeće mesto na mapi.");
        static double Radians(double degrees) => degrees * Math.PI / 180;
        var dLat = Radians(b.Latitude - a.Latitude);
        var dLon = Radians(b.Longitude - a.Longitude);
        var h = Math.Pow(Math.Sin(dLat / 2), 2) + Math.Cos(Radians(a.Latitude))
            * Math.Cos(Radians(b.Latitude)) * Math.Pow(Math.Sin(dLon / 2), 2);
        return 6371.0088 * 2 * Math.Asin(Math.Sqrt(Math.Clamp(h, 0, 1)));
    }

    // Distance alone decides the score; choosing carefully is as valuable as speed.
    public static int Points(double km) => km <= 50 ? 150 : km <= 200 ? 130 : km <= 500 ? 100
        : km <= 1000 ? 70 : km <= 2000 ? 40 : km <= 4000 ? 10 : 0;

    public static double Distance(MapLocation target, GeoPoint guess) =>
        DistanceKm(new GeoPoint(target.Latitude, target.Longitude), guess);
}
