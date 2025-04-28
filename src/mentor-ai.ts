/// <reference types="react" />

import { Theme } from "./models";

export interface MentorAIProps extends HTMLElement {
  mentorUrl?: string;
  authUrl?: string;
  lmsUrl?: string;
  contextOrigins?: string;
  tenant: string;
  mentor: string;
  isAnonymous?: boolean;
  isAdvanced?: boolean;
  isContextAware?: boolean;
  redirectToken?: string;
  authRelyOnHost?: boolean;
  theme?: Theme;
  modal?: string;
  component: string;
}

declare global {
  interface HTMLElementTagNameMap {
    "mentor-ai": MentorAIProps;
  }

  namespace JSX {
    interface IntrinsicElements {
      "mentor-ai": Partial<MentorAIProps> & React.HTMLAttributes<MentorAIProps>;
    }
  }
}

export {};
