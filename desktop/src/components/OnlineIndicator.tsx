import { useTranslation } from "react-i18next";
import { Popover } from "@yza/ui";
import { useOnlineStore } from "@/stores/online";

export function OnlineIndicator() {
  const { t } = useTranslation();
  const users = useOnlineStore((s) => s.users);

  return (
    <Popover
      content={(
        users.length > 0 ? (
          <div className="stc-online__list">
            {users.map((u) => (
              <div className="stc-online__user" key={u.user_id}>
                <span className="stc-online__dot" />
                {u.username}
              </div>
            ))}
          </div>
        ) : (
          <div className="stc-online__empty">{t("online.empty")}</div>
        )
      )}
      title={t("online.title")}
    >
      <button className="stc-online__trigger" type="button">
        <span className="stc-online__dot" />
        <span className="stc-online__count">{users.length}</span>
      </button>
    </Popover>
  );
}
