import React from "react";
import { MentorAIProps } from "./src/mentor-ai"; // Ensure this imports the correct type

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "mentor-ai": Partial<MentorAIProps> & React.HTMLAttributes<MentorAIProps>;
    }
  }
}

export {};
