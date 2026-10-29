"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bonusBadgeStyle } from "./achievement-theme";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { SocialPost } from "@westride/db/social";
import {
  socialPlatforms,
  type SocialPlatform,
} from "@westride/db/social-progress";
import {
  loadSocialProgress,
  draftSocialPost,
  saveSocialPost,
  confirmSocialShare,
  saveSocialEngagement,
} from "./social-actions";

type Result = Awaited<ReturnType<typeof draftSocialPost>>;
export function SocialDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof loadSocialProgress>
  > | null>(null);
  const [id, setId] = useState(() => crypto.randomUUID());
  const [platform, setPlatform] = useState<SocialPlatform>("facebook");
  const [brief, setBrief] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<SocialPost | null>(null);
  const [url, setUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const [zone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const load = useCallback(async () => {
    setData(await loadSocialProgress(zone));
  }, [zone]);
  useEffect(() => {
    let active = true;
    loadSocialProgress(zone)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) {
          setFailed(true);
          setMessage(
            "Your saved posts couldn't load. Close and reopen to retry.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [zone]);
  function select(post: SocialPost) {
    setSelected(post);
    setId(post.id);
    setPlatform(post.platform as SocialPlatform);
    setBrief(post.brief);
    setBody(post.body);
    setUrl(post.sharedUrl ?? "");
    setPublished(Boolean(post.sharedAt));
    setNote(post.engagement ?? "");
    setMessage("");
  }
  function fresh() {
    setSelected(null);
    setId(crypto.randomUUID());
    setBrief("");
    setBody("");
    setUrl("");
    setPublished(false);
    setNote("");
    setMessage("");
  }
  function run(operation: () => Promise<Result>, success: string) {
    setMessage("");
    start(async () => {
      try {
        const result = await operation();
        if (result.status === "error") {
          setFailed(true);
          setMessage(result.message);
          return;
        }
        select(result.post);
        setFailed(false);
        setMessage(success);
        await load();
        router.refresh();
        window.dispatchEvent(new Event("westride:achievements"));
      } catch {
        setFailed(true);
        setMessage(
          "We couldn't save that change. Your text is still here; try again.",
        );
      }
    });
  }
  const saved = Boolean(selected && body.trim() === selected.body);
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
      purpose="form"
      width={880}
      maxHeight="calc(100dvh - (2 * var(--spacing-4)))"
      style={{ height: "calc(100dvh - (2 * var(--spacing-4)))" }}
    >
      <Layout
        height="fill"
        header={
          <DialogHeader
            title="Get social"
            hasDivider
            onOpenChange={(open) => {
              if (!open && !pending) onClose();
            }}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={5}>
              <HStack gap={2} vAlign="center">
                <Badge label="BONUS" variant="purple" style={bonusBadgeStyle} />
                <Text type="supporting">
                  Optional · Share what you’re learning or building.
                </Text>
              </HStack>
              <Text>
                Make a post with Muse, review it, then publish it yourself.
                Share milestones are confirmed by you; WeStride doesn’t verify
                social posts or audience activity.
              </Text>
              {data ? (
                <VStack gap={2}>
                  <ProgressBar
                    label="Optional daily share"
                    value={Math.min(data.progress.todayCount, 1)}
                    max={1}
                    hasValueLabel
                    formatValueLabel={(v) =>
                      v
                        ? "Shared today"
                        : "One useful update, when you have something to share"
                    }
                  />
                  <Text type="supporting">
                    {data.progress.todayCount
                      ? "Great! A useful update each day can help people follow your work."
                      : "Try sharing one thing you learned, one improvement, or a question."}{" "}
                    {data.progress.currentStreak} day streak · Best:{" "}
                    {data.progress.bestStreak} days · {data.progress.todayCount}
                    /3 posts today · {data.progress.platformCount}/2 platforms.
                    Days use {data.timeZone}. Missing a day never removes earned
                    badges.
                  </Text>
                </VStack>
              ) : (
                <Text type="supporting">Loading your posts…</Text>
              )}
              {message ? (
                <Banner
                  role="status"
                  status={failed ? "error" : "success"}
                  title={message}
                />
              ) : null}
              <Divider />
              <HStack gap={2} vAlign="center">
                <Heading level={2} accessibilityLevel={3}>
                  {selected?.sharedAt ? "Your confirmed post" : "Make a post"}
                </Heading>
                <Button
                  label="New draft"
                  variant="ghost"
                  size="sm"
                  isDisabled={pending}
                  onClick={fresh}
                />
              </HStack>
              <Selector
                label="Platform"
                value={platform}
                options={Object.entries(socialPlatforms).map(([id, p]) => ({
                  value: id,
                  label: p.label,
                }))}
                onChange={(value) => setPlatform(value as SocialPlatform)}
                isDisabled={pending || Boolean(selected)}
              />
              <TextArea
                label="What would you like to share?"
                value={brief}
                onChange={setBrief}
                maxLength={1200}
                rows={3}
                isDisabled={pending || Boolean(selected)}
                description="Describe a real improvement, lesson, or thing you made. Include only details you want to make public."
              />
              {!selected?.sharedAt ? (
                <Button
                  label={
                    selected?.generatedAt
                      ? "Muse draft saved"
                      : "Draft with Muse"
                  }
                  variant="secondary"
                  isLoading={pending}
                  isDisabled={!brief.trim() || Boolean(selected?.generatedAt)}
                  onClick={() =>
                    run(
                      () => draftSocialPost({ id, platform, brief }),
                      "Muse draft saved. Read it and make it yours before sharing.",
                    )
                  }
                />
              ) : null}
              <TextArea
                label="Your post"
                value={body}
                onChange={setBody}
                maxLength={500}
                rows={5}
                isDisabled={pending || Boolean(selected?.sharedAt)}
                description="Write your own or edit Muse’s draft. Up to 500 characters. For Instagram, pair this caption with your own screenshot or demo."
              />
              <HStack gap={2} wrap="wrap">
                {!selected?.sharedAt ? (
                  <Button
                    label="Save draft"
                    variant="primary"
                    isLoading={pending}
                    isDisabled={!body.trim() || !brief.trim()}
                    onClick={() =>
                      run(
                        () => saveSocialPost({ id, platform, brief, body }),
                        "Draft saved. Copy it when you're ready.",
                      )
                    }
                  />
                ) : null}
                <Button
                  label="Copy post"
                  variant="secondary"
                  isDisabled={!body.trim() || pending}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(body);
                      setFailed(false);
                      setMessage(
                        "Copied. Paste it into your social app and review before publishing.",
                      );
                    } catch {
                      setFailed(true);
                      setMessage(
                        "Copy wasn't available. Select the text above and copy it manually.",
                      );
                    }
                  }}
                />
                <Link
                  href={socialPlatforms[platform].href}
                  isStandalone
                  isExternalLink
                >
                  Open {socialPlatforms[platform].label}
                </Link>
              </HStack>
              <Divider />
              {selected?.sharedAt ? (
                <VStack gap={3}>
                  <Link href={selected.sharedUrl!} isStandalone isExternalLink>
                    View your published post
                  </Link>
                  <Text type="supporting">
                    Confirmed by you on {selected.sharedDay}.
                  </Text>
                  <TextArea
                    label="What did you learn from a reply?"
                    description="Summarize one useful response or piece of feedback. Leave out names and personal details."
                    value={note}
                    onChange={setNote}
                    maxLength={600}
                    rows={3}
                    isDisabled={pending}
                  />
                  <Button
                    label="Record feedback"
                    variant="secondary"
                    isLoading={pending}
                    isDisabled={note.trim().length < 10}
                    onClick={() =>
                      run(
                        () => saveSocialEngagement({ id, note }),
                        "Feedback recorded. Keep it in mind for your next improvement.",
                      )
                    }
                  />
                </VStack>
              ) : (
                <VStack gap={3}>
                  <Heading level={2} accessibilityLevel={3}>
                    After you publish
                  </Heading>
                  <TextInput
                    label="Published post link"
                    value={url}
                    onChange={setUrl}
                    placeholder={
                      platform === "threads"
                        ? "https://www.threads.com/@you/post/…"
                        : platform === "instagram"
                          ? "https://www.instagram.com/p/…"
                          : "https://www.facebook.com/you/posts/…"
                    }
                    isDisabled={pending}
                  />
                  <CheckboxInput
                    label="I published this post."
                    value={published}
                    onChange={setPublished}
                    isDisabled={pending}
                    description="Copying or opening a platform does not earn a share badge."
                  />
                  <Button
                    label="Confirm share"
                    variant="primary"
                    isLoading={pending}
                    isDisabled={!saved || !published || !url.trim()}
                    onClick={() =>
                      run(
                        () =>
                          confirmSocialShare({
                            id,
                            url,
                            published,
                            timeZone: data?.timeZone ?? zone,
                          }),
                        "Share confirmed. Your bonus progress is saved.",
                      )
                    }
                  />
                  {!saved ? (
                    <Text type="supporting">
                      Save your post text before confirming a share.
                    </Text>
                  ) : null}
                </VStack>
              )}
              {data?.posts.length ? (
                <VStack gap={3}>
                  <Divider />
                  <Heading level={2} accessibilityLevel={3}>
                    Your posts
                  </Heading>
                  <List density="compact" hasDividers>
                    {data.posts.map((post) => (
                      <ListItem
                        key={post.id}
                        label={<Text>{post.brief}</Text>}
                        description={`${socialPlatforms[post.platform as SocialPlatform].label} · ${post.sharedAt ? "Shared · confirmed by you" : post.generatedAt ? "Muse draft" : "Draft"}`}
                        endContent={
                          <Button
                            label="Open"
                            variant="ghost"
                            size="sm"
                            isDisabled={pending}
                            onClick={() => select(post)}
                          />
                        }
                      />
                    ))}
                  </List>
                </VStack>
              ) : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <Button
              label="Close"
              variant="secondary"
              isDisabled={pending}
              onClick={onClose}
            />
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
