-- Give every existing account a FamilyMember of its own, so the household owner
-- can rate and review meals (ratings/feedback are keyed to FamilyMember).
--
-- Prefer adopting an unlinked ADULT member whose name already matches the
-- account name -- households typically added themselves by hand -- and only
-- create a new member when there is nothing to adopt.

DO $$
DECLARE
  account RECORD;
  match_id TEXT;
BEGIN
  FOR account IN
    SELECT u.id, u.name, u.email, u."householdId"
    FROM "User" u
    WHERE u."householdId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "FamilyMember" fm WHERE fm."userId" = u.id
      )
    ORDER BY u."createdAt"
  LOOP
    SELECT fm.id INTO match_id
    FROM "FamilyMember" fm
    WHERE fm."householdId" = account."householdId"
      AND fm."userId" IS NULL
      AND fm.role = 'ADULT'
      AND account.name IS NOT NULL
      AND lower(btrim(fm.name)) = lower(btrim(account.name))
    ORDER BY fm."createdAt"
    LIMIT 1;

    IF match_id IS NOT NULL THEN
      UPDATE "FamilyMember"
      SET "userId" = account.id, "updatedAt" = NOW()
      WHERE id = match_id;
    ELSE
      INSERT INTO "FamilyMember" (id, name, role, "createdAt", "updatedAt", "householdId", "userId")
      VALUES (
        'self_' || account.id,
        COALESCE(
          NULLIF(btrim(account.name), ''),
          NULLIF(split_part(account.email, '@', 1), ''),
          'Me'
        ),
        'ADULT',
        NOW(),
        NOW(),
        account."householdId",
        account.id
      );
    END IF;

    match_id := NULL;
  END LOOP;
END $$;
