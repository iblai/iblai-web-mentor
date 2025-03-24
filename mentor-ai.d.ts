export interface MentorAIElement extends HTMLElement {
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
    "mentor-ai": MentorAIElement;
  }
  namespace JSX {
    interface IntrinsicElements {
      "mentor-ai": Partial<MentorAIElement> &
        React.HTMLAttributes<MentorAIElement>;
    }
  }
}

export {};
