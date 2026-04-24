import { motion, type Variants } from 'framer-motion';
import { useMemo } from 'react';

import { buildWaterDipRanks } from '@/ui/motion/waterDipRanks';
import {
  makeWaterDipCharEnterExitVariants,
  type WaterDipCharCustom,
} from '@/ui/motion/waterDipTextVariants';

import './ContactDipLinks.css';

const linkShell: Variants = {
  show: { opacity: 1 },
  exit: { opacity: 0, transition: { when: 'afterChildren' as const, duration: 0.1 } },
  hidden: { opacity: 1 },
};

const contactDipEmailHero: Variants = {
  show: { opacity: 1, transition: { when: 'beforeChildren' as const, delayChildren: 0.02 } },
  exit: { opacity: 0, transition: { when: 'afterChildren' as const, duration: 0.1 } },
  hidden: { opacity: 1 },
};

type ContactDipLinksProps = {
  reduce: boolean;
  email: string;
  emailHref: string;
  emailClassName: string;
  phone: string;
  phoneHref: string;
  phoneClassName: string;
};

export function ContactDipLinks({
  reduce,
  email,
  emailHref,
  emailClassName,
  phone,
  phoneHref,
  phoneClassName,
}: ContactDipLinksProps) {
  const { emailSeg, phoneSeg, charV } = useMemo(() => {
    const all = buildWaterDipRanks([email, phone]);
    return {
      emailSeg: all.filter((s) => s.line === 0),
      phoneSeg: all.filter((s) => s.line === 1),
      charV: makeWaterDipCharEnterExitVariants({
        stagger: 0.018,
        reduce,
        startDelay: 0.008,
        exitStagger: 0.016,
        exitDuration: 0.12,
      }),
    };
  }, [email, phone, reduce]);

  return (
    <motion.div
      className="contact-page__email-hero"
      initial="show"
      animate="show"
      exit="exit"
      variants={contactDipEmailHero}
    >
      <ContactDipLink
        className={emailClassName}
        href={emailHref}
        segments={emailSeg}
        charVariants={charV}
        ariaLabel={email}
      />
      <ContactDipLink
        className={phoneClassName}
        href={phoneHref}
        segments={phoneSeg}
        charVariants={charV}
        ariaLabel={phone}
      />
    </motion.div>
  );
}

type ContactDipLinkProps = {
  href: string;
  className: string;
  segments: { ch: string; key: string; rank: number }[];
  charVariants: Variants;
  ariaLabel: string;
};

function ContactDipLink({ href, className, segments, charVariants, ariaLabel }: ContactDipLinkProps) {
  return (
    <motion.a
      className={className}
      href={href}
      aria-label={ariaLabel}
      variants={linkShell}
      initial="show"
      animate="show"
      exit="exit"
    >
      {segments.map(({ ch, key, rank }) => {
        const custom: WaterDipCharCustom = { rank };
        if (ch === ' ') {
          return (
            <motion.span
              key={key}
              className="contact-dip-glyph contact-dip-glyph--space"
              custom={custom}
              variants={charVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              style={{ transformStyle: 'preserve-3d' }}
              aria-hidden
            >
              &nbsp;
            </motion.span>
          );
        }
        return (
          <motion.span
            key={key}
            className="contact-dip-glyph"
            custom={custom}
            variants={charVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformStyle: 'preserve-3d' }}
            aria-hidden
          >
            {ch}
          </motion.span>
        );
      })}
    </motion.a>
  );
}
