"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { FileInput } from "@astryxdesign/core/FileInput";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { ArrowUpTrayIcon, PhotoIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { EntityImageKind } from "@westride/db/entity-images";
import { MAX_SOURCE_IMAGE_BYTES } from "@/lib/entity-images/limits";
import { prepareEntityImage } from "@/lib/entity-images/prepare-image";
import { removeEntityImageAction, uploadEntityImageAction } from "./entity-image-actions";
import { MuseImageDialog } from "./muse-image-dialog";

async function saveImage(kind: EntityImageKind, id: string, image: Blob): Promise<string | null> {
  const formData = new FormData();
  formData.set("kind", kind);
  formData.set("id", id);
  formData.set("image", await prepareEntityImage(image));
  const result = await uploadEntityImageAction(formData);
  return result.status === "error" ? result.message : null;
}

/** Lets an editor generate, upload, or remove the primary image. */
export function EntityImageMenu({
  kind,
  id,
  name,
  imageUrl,
  hasMetaConnection,
}: {
  kind: EntityImageKind;
  id: string;
  name: string;
  imageUrl: string | null;
  hasMetaConnection: boolean;
}) {
  const router = useRouter();
  const [museOpen, setMuseOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isRemoving, startRemoving] = useTransition();

  async function keepGenerated(preview: string): Promise<string | null> {
    try {
      const image = await (await fetch(preview)).blob();
      const message = await saveImage(kind, id, image);
      if (!message) {
        router.refresh();
      }
      return message;
    } catch (error) {
      console.error("Saving generated image failed", error);
      return "The image could not be saved. Try again.";
    }
  }

  function remove() {
    if (!window.confirm(`Remove the image from ${name}?`)) {
      return;
    }
    startRemoving(async () => {
      const result = await removeEntityImageAction({ kind, id });
      if (result.status === "error") {
        window.alert(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu
        button={{
          label: imageUrl ? "Change image" : "Add image",
          variant: "secondary",
          icon: <Icon icon={PhotoIcon} size="sm" />,
          children: imageUrl ? "Change image" : "Add image",
          isLoading: isRemoving,
        }}
        menuWidth={260}
        items={[
          {
            label: "Generate with Muse",
            description: "Describe it, or let Muse write the description",
            icon: SparklesIcon,
            onClick: () => setMuseOpen(true),
          },
          {
            label: "Upload a picture",
            description: "JPEG, PNG, or WebP, cropped to a square",
            icon: ArrowUpTrayIcon,
            onClick: () => setUploadOpen(true),
          },
          ...(imageUrl
            ? [
                { type: "divider" as const },
                {
                  label: "Remove image",
                  icon: TrashIcon,
                  variant: "destructive" as const,
                  onClick: remove,
                },
              ]
            : []),
        ]}
      />
      <MuseImageDialog
        isOpen={museOpen}
        onOpenChange={setMuseOpen}
        kind={kind}
        id={id}
        name={name}
        hasMetaConnection={hasMetaConnection}
        onKeep={keepGenerated}
      />
      {uploadOpen ? (
        <UploadImageDialog
          name={name}
          currentUrl={imageUrl}
          onClose={() => setUploadOpen(false)}
          onSave={async (file) => {
            const message = await saveImage(kind, id, file);
            if (!message) {
              router.refresh();
            }
            return message;
          }}
        />
      ) : null}
    </>
  );
}

function UploadImageDialog({
  name,
  currentUrl,
  onClose,
  onSave,
}: {
  name: string;
  currentUrl: string | null;
  onClose: () => void;
  onSave: (file: File) => Promise<string | null>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function pick(value: File | File[] | null) {
    const picked = Array.isArray(value) ? (value[0] ?? null) : value;
    setFile(picked);
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  function close() {
    if (isSaving) {
      return;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  }

  function save() {
    if (!file) {
      setError("Choose a picture to upload.");
      return;
    }
    startSaving(async () => {
      try {
        const message = await onSave(file);
        if (message) {
          setError(message);
          return;
        }
        close();
      } catch (caught) {
        console.error("Image upload failed", caught);
        setError("That picture could not be read. Try a JPEG, PNG, or WebP.");
      }
    });
  }

  return (
    <Dialog isOpen onOpenChange={(open) => (open ? undefined : close())} purpose="form" width={520}>
      <Layout
        height="fill"
        header={<DialogHeader title="Upload an image" hasDivider onOpenChange={() => close()} />}
        content={
          <LayoutContent>
            <VStack gap={4}>
              {error ? <Banner status="error" title={error} /> : null}
              <HStack gap={4} vAlign="center" wrap="wrap">
                <Avatar
                  src={previewUrl ?? currentUrl ?? undefined}
                  name={name}
                  size={96}
                  shape="rounded"
                  tooltip={false}
                />
                <StackItem size="fill">
                  <FileInput
                    label="Picture"
                    description="It is cropped to a square and saved at 512 × 512."
                    accept="image/jpeg,image/png,image/webp"
                    maxSize={MAX_SOURCE_IMAGE_BYTES}
                    mode="dropzone"
                    value={file}
                    onChange={pick}
                    isDisabled={isSaving}
                  />
                </StackItem>
              </HStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} vAlign="center">
              <StackItem size="fill" />
              <Button label="Cancel" variant="secondary" isDisabled={isSaving} onClick={close} />
              <Button label="Save image" variant="primary" isLoading={isSaving} isDisabled={!file} onClick={save} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
