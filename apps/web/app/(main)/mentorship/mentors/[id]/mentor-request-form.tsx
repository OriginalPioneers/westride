"use client";

import { startTransition, useActionState, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import {
  INQUIRY_REASONS,
  MAX_REQUEST_DETAILS,
  START_TIMES,
  type SubmitMentorRequestState,
} from "@/lib/mentorship/request-schema";
import { submitMentorRequest } from "../../actions";

export type MentorRequestFormProps = {
  mentorId: string;
  mentorName: string;
  isSignedIn: boolean;
  signInHref: string;
  defaults: {
    fullName: string;
    email: string;
  };
};

const INITIAL_STATE: SubmitMentorRequestState = { status: "idle" };

function errorStatus(message: string | undefined) {
  return message ? { type: "error" as const, message } : undefined;
}

export function MentorRequestForm({
  mentorId,
  mentorName,
  isSignedIn,
  signInHref,
  defaults,
}: MentorRequestFormProps) {
  const [state, submit, isSubmitting] = useActionState(
    submitMentorRequest.bind(null, mentorId),
    INITIAL_STATE,
  );
  const [fullName, setFullName] = useState(defaults.fullName);
  const [email, setEmail] = useState(defaults.email);
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [inquiryReason, setInquiryReason] = useState("");
  const [timing, setTiming] = useState("");
  const [details, setDetails] = useState("");

  const fieldErrors = state.status === "error" ? state.fieldErrors : {};

  function handleSubmit() {
    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("email", email);
    formData.set("company", company);
    formData.set("jobTitle", jobTitle);
    formData.set("phone", phone);
    formData.set("inquiryReason", inquiryReason);
    formData.set("timing", timing);
    formData.set("details", details);
    startTransition(() => {
      submit(formData);
    });
  }

  if (state.status === "success") {
    return (
      <Banner
        status="success"
        title="Request sent"
        description={`${mentorName} will see it on this page the next time they sign in.`}
      />
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (isSignedIn && !isSubmitting) {
          handleSubmit();
        }
      }}
    >
    <VStack gap={4}>
      {state.status === "error" ? (
        <Banner status="error" title={state.message} />
      ) : null}
      <Text type="label">Your details</Text>
      <TextInput
        label="Full name"
        isLabelHidden
        isRequired
        placeholder="Full name*"
        autoComplete="name"
        value={fullName}
        onChange={setFullName}
        status={errorStatus(fieldErrors.fullName)}
      />
      <Grid columns={{ minWidth: 180 }} gap={3}>
        <TextInput
          label="Email"
          isLabelHidden
          isRequired
          type="email"
          placeholder="Email*"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          status={errorStatus(fieldErrors.email)}
        />
        <TextInput
          label="Company or project"
          isLabelHidden
          placeholder="Company or project"
          autoComplete="organization"
          value={company}
          onChange={setCompany}
          status={errorStatus(fieldErrors.company)}
        />
      </Grid>
      <Grid columns={{ minWidth: 180 }} gap={3}>
        <TextInput
          label="Role"
          isLabelHidden
          placeholder="Role"
          autoComplete="organization-title"
          value={jobTitle}
          onChange={setJobTitle}
          status={errorStatus(fieldErrors.jobTitle)}
        />
        <TextInput
          label="Phone number"
          isLabelHidden
          type="text"
          placeholder="Phone number"
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
          status={errorStatus(fieldErrors.phone)}
        />
      </Grid>

      <VStack gap={2}>
        <Text type="label">What do you want help with?</Text>
        <HStack gap={2} wrap="wrap">
          {INQUIRY_REASONS.map((reason) => (
            <Token
              key={reason}
              label={reason}
              color={inquiryReason === reason ? "blue" : "default"}
              onClick={() =>
                setInquiryReason((current) => (current === reason ? "" : reason))
              }
            />
          ))}
        </HStack>
        {fieldErrors.inquiryReason ? (
          <Text type="supporting">{fieldErrors.inquiryReason}</Text>
        ) : null}
      </VStack>
      <Selector
        label="When do you want to start?"
        options={[...START_TIMES]}
        value={timing}
        onChange={(value) => setTiming(value ?? "")}
        placeholder="Select a start time..."
        status={errorStatus(fieldErrors.timing)}
      />
      <TextArea
        label="How can they help?"
        isLabelHidden
        isRequired
        placeholder="How can they help?*"
        value={details}
        onChange={setDetails}
        rows={4}
        maxLength={MAX_REQUEST_DETAILS}
        status={errorStatus(fieldErrors.details)}
      />
      <VStack hAlign="stretch" gap={2}>
        {isSignedIn ? (
          <Button
            label="Request mentorship"
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
          />
        ) : (
          <>
            <Button
              label="Sign in to request mentorship"
              variant="primary"
              href={signInHref}
            />
            <Text type="supporting">
              Sign in so {mentorName} knows which member sent the request.
            </Text>
          </>
        )}
      </VStack>
    </VStack>
    </form>
  );
}
