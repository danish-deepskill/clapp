import { type ReactNode } from 'react';

import { Banner } from '@renderer/components/Banner';
import { SectionCard } from '@renderer/components/SectionCard';

export interface PlaceholderSectionProps {
  label: string;
  title?: ReactNode;
  meta?: ReactNode;
  /** Short Indonesian description of what the section will do once built. */
  description: ReactNode;
}

/**
 * A section card that renders its header and an info banner explaining the
 * section is coming in a later PR. Used by Backup / Cloud / Pembaruan in
 * Pengaturan PR1 so the screen's full shape is honest without shipping
 * half-built features.
 */
export function PlaceholderSection({
  label,
  title,
  meta,
  description,
}: PlaceholderSectionProps) {
  return (
    <SectionCard
      label={label}
      title={title}
      meta={meta}
      defaultCollapsed
    >
      <div className="px-5 py-4">
        <Banner variant="info">
          <b>Belum dibangun.</b> {description}
        </Banner>
      </div>
    </SectionCard>
  );
}
