"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DetectedRelative } from "@/lib/types";
import { haptic } from "@/lib/telegram";

const RELATIONSHIP_TYPES = [
  { value: "mother", label: "Мать" },
  { value: "father", label: "Отец" },
  { value: "brother", label: "Брат" },
  { value: "sister", label: "Сестра" },
  { value: "grandfather", label: "Дедушка" },
  { value: "grandmother", label: "Бабушка" },
  { value: "uncle", label: "Дядя" },
  { value: "aunt", label: "Тётя" },
  { value: "son", label: "Сын" },
  { value: "daughter", label: "Дочь" },
  { value: "spouse", label: "Супруг(а)" },
];

export function RelativeDetected({
  relative,
  onCreateProfile,
  onSkip,
  loading,
}: {
  relative: DetectedRelative;
  onCreateProfile: (data: {
    first_name: string;
    last_name?: string;
    birth_year?: number;
    gender: string;
    relationship_type: string;
  }) => void;
  onSkip: () => void;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [firstName, setFirstName] = useState(relative.name.split(" ")[0] || "");
  const [lastName, setLastName] = useState(
    relative.name.split(" ").slice(1).join(" ") || ""
  );
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState("other");
  const [relationshipType, setRelationshipType] = useState(
    relative.probable_role || ""
  );

  const handleCreate = () => {
    haptic("success");
    onCreateProfile({
      first_name: firstName,
      last_name: lastName || undefined,
      birth_year: birthYear ? parseInt(birthYear) : undefined,
      gender,
      relationship_type: relationshipType,
    });
  };

  if (!expanded) {
    return (
      <div className="mx-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm">
          <UserPlus className="h-4 w-4 text-primary" />
          <span className="font-medium">
            Найден родственник: {relative.name}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              haptic("light");
              setExpanded(true);
            }}
            className="flex-1"
          >
            Создать профиль
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              haptic("light");
              onSkip();
            }}
          >
            Пропустить
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserPlus className="h-4 w-4 text-primary" />
          Новый родственник
        </div>
        <button onClick={onSkip} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Имя *"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Фамилия"
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            placeholder="Год рождения"
            type="number"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="other">Пол</option>
            <option value="male">Муж</option>
            <option value="female">Жен</option>
          </select>
        </div>

        {/* Relationship type buttons */}
        <div className="flex flex-wrap gap-1.5">
          {RELATIONSHIP_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                haptic("selection");
                setRelationshipType(value);
              }}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                relationshipType === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleCreate}
          loading={loading}
          disabled={!firstName || !relationshipType}
        >
          Создать профиль
        </Button>
      </div>
    </div>
  );
}
