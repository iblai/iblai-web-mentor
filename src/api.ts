export interface ITenant {
  active: boolean;
  added_on: string;
  cms_url: string;
  email: string;
  expired_on: string;
  is_admin: boolean;
  is_staff: boolean;
  key: string;
  lms_url: string;
  name: string;
  org: string;
  portal_url: string;
  public: string;
  user_active: boolean;
  user_id: number;
  username: string;
}

export async function fetchUserTenants(
  lmsUrl: string,
  edxJwtToken?: string
): Promise<ITenant[]> {
  const headers: HeadersInit = {};
  if (edxJwtToken) {
    headers["Authorization"] = `JWT ${edxJwtToken}`;
  }

  const response = await fetch(`${lmsUrl}/api/ibl/users/manage/platform/`, {
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return data;
}

export async function fetchUserTokens(
  lmsUrl: string,
  platformKey: string,
  edxJwtToken?: string
) {
  const formData = new FormData();
  formData.append("platform_key", platformKey);

  const headers: HeadersInit = {};
  if (edxJwtToken) {
    headers["Authorization"] = `JWT ${edxJwtToken}`;
  }

  const response = await fetch(
    `${lmsUrl}/api/ibl/manager/consolidated-token/proxy/`,
    {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    }
  );
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return data.data;
}
