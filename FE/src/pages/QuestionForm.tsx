// src/components/QuestionForm.tsx
import React, { useState } from 'react';
import { QuestionDto } from '../models/Question';
import { OptionDto } from '../models/Option';
import './css/QuestionForm.css';

interface QuestionFormProps {
  initialData: QuestionDto;
  onSave: (question: QuestionDto) => void;
  onCancel: () => void;
}

let tempOptionId = -1; // koristi se za privremene ID-jeve

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData, onSave, onCancel }) => {
  const [question, setQuestion] = useState<QuestionDto>(() => ({
    id: initialData.id || 0,
    text: initialData.text || '',
    type: initialData.type || 'single',
    points: initialData.points || 1,
    quizId: initialData.quizId || 0,
    allowMultipleAnswers: initialData.allowMultipleAnswers || false,
    options: initialData.options ? [...initialData.options] : [],
    correctTextAnswer: initialData.correctTextAnswer || '',
  }));

  type InputChangeEvent = React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >;

  const handleChange = (e: InputChangeEvent) => {
    const target = e.target;
    const name = target.name;
    let value: string | boolean | number = target.value;

    if (target.type === 'checkbox') {
      value = (target as HTMLInputElement).checked;
    }
    if (name === 'points') {
      value = Number(value);
    }

    setQuestion((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addOption = () => {
    setQuestion((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: tempOptionId--, // negativan ID dok se ne sačuva na backendu
          text: '',
          isCorrect: false,
        },
      ],
    }));
  };

  const updateOption = (
    index: number,
    field: keyof Pick<OptionDto, 'text' | 'isCorrect'>,
    value: string | boolean
  ) => {
    setQuestion((prev) => {
      const newOptions = [...prev.options];
      if (field === 'text' && typeof value === 'string') {
        newOptions[index].text = value;
      } else if (field === 'isCorrect' && typeof value === 'boolean') {
        newOptions[index].isCorrect = value;
      }
      return { ...prev, options: newOptions };
    });
  };

  const removeOption = (index: number) => {
    setQuestion((prev) => {
      const newOptions = [...prev.options];
      newOptions.splice(index, 1);
      return { ...prev, options: newOptions };
    });
  };

  const questionHasOptions = question.type !== 'text';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    

    if (!question.text.trim()) {
      alert('Unesite tekst pitanja.');
      return;
    }

    if (questionHasOptions) {
      if (question.options.length === 0) {
        alert('Dodajte bar jednu opciju.');
        return;
      }
      if (!question.options.some((opt) => opt.isCorrect)) {
        alert('Označite bar jednu tačnu opciju.');
        return;
      }
      if (question.type === 'single' && question.options.filter((opt) => opt.isCorrect).length > 1) {
        alert('Za "single" tip pitanja može biti samo jedna tačna opcija.');
        return;
      }
    }


    if (question.type === 'text' && !question.correctTextAnswer?.trim()) {
        alert('Unesite tačan odgovor za tekstualno pitanje.');
        return;
       }

    try {
    await onSave(question);  // await ovde
  } catch (error) {
    alert('Greška pri čuvanju pitanja.');
    console.error(error);
  }
  };

  return (
    <div className="question-form">
      <h2>Dodavanje/Izmena pitanja</h2>

      <div>
        <label>Tekst pitanja</label>
        <textarea
          name="text"
          value={question.text}
          onChange={handleChange}
          className="question-textarea"
          rows={3}
          required
        />
      </div>

      <div>
        <label>Tip pitanja</label>
        <select name="type" value={question.type} onChange={handleChange}>
          <option value="single">Single choice (jedan odgovor)</option>
          <option value="multiple">Multiple choice (više odgovora)</option>
          <option value="truefalse">Tačno/Netačno</option>
          <option value="text">Tekstualni odgovor</option>
        </select>
      </div>

      <div>
        <label>Težina (poeni)</label>
        <input
          type="number"
          name="points"
          value={question.points}
          onChange={handleChange}
          min={1}
          required
        />
      </div>

      {question.type === 'text' && (
  <div>
    <label>Tačan odgovor</label>
    <input
      type="text"
      name="correctTextAnswer"
      value={question.correctTextAnswer}
      onChange={handleChange}
      className="question-input"
      placeholder="Unesi tačan odgovor"
      required
    />
  </div>
)}


      {questionHasOptions && (
        <div className="options-container">
          <label>Opcije</label>
          {question.options.map((option, idx) => (
            <div key={option.id} className="option-row">
              <input
                type="text"
                value={option.text}
                onChange={(e) => updateOption(idx, 'text', e.target.value)}
                placeholder={`Opcija ${idx + 1}`}
                required
              />
              <label>
                <input
                  type={question.type === 'multiple' ? 'checkbox' : 'radio'}
                  name="correctOption"
                  checked={option.isCorrect}
                  onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)}
                />
                Tačno
              </label>
              <button type="button" onClick={() => removeOption(idx)} title="Obriši opciju">
                &times;
              </button>
            </div>
          ))}

          <button type="button" onClick={addOption} className="add-option-btn">
            Dodaj opciju
          </button>
        </div>
      )}

      <div className="button-row">
        <button type="button" onClick={onCancel} className="cancel-btn">
          Otkaži
        </button>
        <button type="button" onClick={handleSubmit} className="submit-btn">
          Sačuvaj
        </button>
      </div>
    </div>
  );
};

export default QuestionForm;