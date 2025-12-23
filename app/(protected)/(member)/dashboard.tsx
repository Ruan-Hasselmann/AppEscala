import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { CalendarDashboard } from "@/src/components/CalendarDashboard";
import { useAuth } from "@/src/contexts/AuthContext";
import { getMockCalendarData } from "@/src/mocks/calendarMock";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function MemberDashboard() {
    const { user, logout } = useAuth();
    const [month] = useState(new Date());

    return (
        <AppScreen>
            <AppHeader
                title="Minha Escala"
                subtitle={user?.name}
                onLogout={logout}
            />

            <View style={{ padding: 16 }}>
                <CalendarDashboard
                    month={month}
                    data={getMockCalendarData(month)}
                />
            </View>
        </AppScreen>
    );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },

    monthHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: "800",
        textTransform: "capitalize",
    },
    nav: {
        fontSize: 18,
        fontWeight: "800",
    },

    weekRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    weekDay: {
        flex: 1,
        textAlign: "center",
        fontWeight: "700",
        color: "#6B7280",
    },

    calendar: {
        flexDirection: "row",
        flexWrap: "wrap",
    },

    empty: {
        width: "14.2857%",
        aspectRatio: 1,
    },

    dayCell: {
        width: "14.2857%",
        aspectRatio: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginBottom: 8,
    },

    today: {
        borderColor: "#2563EB",
        borderWidth: 2,
    },

    dayNumber: {
        fontWeight: "700",
        marginBottom: 4,
    },

    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotPublished: {
        backgroundColor: "#22C55E",
    },
    dotDraft: {
        backgroundColor: "#F59E0B",
    },
    dotPending: {
        backgroundColor: "#EF4444",
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
    },
    modal: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 12,
        textTransform: "capitalize",
    },
    service: {
        marginBottom: 12,
    },
    serviceTitle: {
        fontWeight: "700",
    },
    person: {
        fontSize: 14,
        color: "#374151",
    },
    close: {
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        backgroundColor: "#111827",
        alignItems: "center",
    },
    closeText: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
});
