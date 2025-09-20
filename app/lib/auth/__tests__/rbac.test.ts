import {
  extractSubdomain,
  isRoleAllowedForPortal,
  getCookieName,
  type UserRole,
  type Portal,
} from "../rbac";

describe("RBAC System", () => {
  describe("extractSubdomain", () => {
    it("should extract subdomain from production URLs", () => {
      expect(extractSubdomain("admin.gymleadhub.co.uk")).toBe("admin");
      expect(extractSubdomain("login.gymleadhub.co.uk")).toBe("owner");
      expect(extractSubdomain("members.gymleadhub.co.uk")).toBe("member");
    });

    it("should handle localhost URLs", () => {
      expect(extractSubdomain("admin.localhost:3000")).toBe("admin");
      expect(extractSubdomain("localhost:3000")).toBe("owner"); // default
    });

    it("should handle Vercel preview URLs", () => {
      expect(extractSubdomain("preview-abc123.vercel.app")).toBe("owner"); // default
    });
  });

  describe("isRoleAllowedForPortal", () => {
    const testCases: Array<{
      role: UserRole;
      portal: Portal;
      expected: boolean;
      description: string;
    }> = [
      // Admin portal
      {
        role: "superadmin",
        portal: "admin",
        expected: true,
        description: "superadmin can access admin portal",
      },
      {
        role: "owner",
        portal: "admin",
        expected: false,
        description: "owner cannot access admin portal",
      },
      {
        role: "member",
        portal: "admin",
        expected: false,
        description: "member cannot access admin portal",
      },

      // Owner portal
      {
        role: "owner",
        portal: "owner",
        expected: true,
        description: "owner can access owner portal",
      },
      {
        role: "coach",
        portal: "owner",
        expected: true,
        description: "coach can access owner portal",
      },
      {
        role: "superadmin",
        portal: "owner",
        expected: true,
        description: "superadmin can access owner portal",
      },
      {
        role: "member",
        portal: "owner",
        expected: false,
        description: "member cannot access owner portal",
      },

      // Member portal
      {
        role: "member",
        portal: "member",
        expected: true,
        description: "member can access member portal",
      },
      {
        role: "owner",
        portal: "member",
        expected: false,
        description: "owner cannot access member portal",
      },
      {
        role: "superadmin",
        portal: "member",
        expected: false,
        description: "superadmin cannot access member portal",
      },
    ];

    testCases.forEach(({ role, portal, expected, description }) => {
      it(description, () => {
        expect(isRoleAllowedForPortal(role, portal)).toBe(expected);
      });
    });
  });

  describe("getCookieName", () => {
    it("should return correct cookie names for each portal", () => {
      expect(getCookieName("admin")).toBe("admin_session");
      expect(getCookieName("owner")).toBe("owner_session");
      expect(getCookieName("member")).toBe("member_session");
    });
  });
});
