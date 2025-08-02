//src/models/Option.ts
export interface OptionDto {
  id: number; // može biti string (GUID, 'true'/'false', itd.)
  text: string;
  isCorrect: boolean;
}
