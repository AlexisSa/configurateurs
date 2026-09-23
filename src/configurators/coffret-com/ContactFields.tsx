"use client";

import { useId, useState } from "react";
import { Text } from "@/core/design-system";
import type { QuoteContactInfo } from "./contactInfo";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailValid(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

function isPhoneValid(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

const fieldClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

type ContactFieldsProps = {
  contact: QuoteContactInfo;
  onChange: <K extends keyof QuoteContactInfo>(
    field: K,
    value: QuoteContactInfo[K],
  ) => void;
};

/**
 * Coordonnées + commentaire client (optionnels) — inclus dans le PDF s’ils sont renseignés.
 */
export function ContactFields({ contact, onChange }: ContactFieldsProps) {
  const emailErrorId = useId();
  const phoneErrorId = useId();
  const [touched, setTouched] = useState({ email: false, telephone: false });

  const emailFilled = contact.email.trim().length > 0;
  const phoneFilled = contact.telephone.trim().length > 0;
  const showEmailError =
    touched.email && emailFilled && !isEmailValid(contact.email);
  const showPhoneError =
    touched.telephone && phoneFilled && !isPhoneValid(contact.telephone);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3">
      <div>
        <Text className="text-sm font-medium text-zinc-800">
          Vos informations
        </Text>
        <Text muted className="mt-0.5 text-xs">
          Optionnel — apparaîtront sur le PDF si renseignées.
        </Text>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Nom</span>
          <input
            type="text"
            className={fieldClass}
            value={contact.clientName}
            onChange={(e) => onChange("clientName", e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Société</span>
          <input
            type="text"
            className={fieldClass}
            value={contact.societe}
            onChange={(e) => onChange("societe", e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Email</span>
          <input
            type="email"
            className={`${fieldClass}${showEmailError ? " border-red-400" : ""}`}
            value={contact.email}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            autoComplete="email"
            aria-invalid={showEmailError}
            aria-describedby={showEmailError ? emailErrorId : undefined}
          />
          {showEmailError && (
            <span id={emailErrorId} className="text-xs text-red-700">
              Adresse email invalide
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700">Téléphone</span>
          <input
            type="tel"
            className={`${fieldClass}${showPhoneError ? " border-red-400" : ""}`}
            value={contact.telephone}
            onChange={(e) => onChange("telephone", e.target.value)}
            onBlur={() => setTouched((prev) => ({ ...prev, telephone: true }))}
            autoComplete="tel"
            aria-invalid={showPhoneError}
            aria-describedby={showPhoneError ? phoneErrorId : undefined}
          />
          {showPhoneError && (
            <span id={phoneErrorId} className="text-xs text-red-700">
              Numéro de téléphone invalide
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-zinc-700">Commentaire</span>
          <textarea
            className={`${fieldClass} min-h-[5.5rem] resize-y`}
            rows={3}
            value={contact.commentaire}
            onChange={(e) => onChange("commentaire", e.target.value)}
            placeholder="Précisions sur le projet, contraintes d’installation, délais…"
          />
        </label>
      </div>
    </div>
  );
}
