package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func SendPushNotification(playerIds []string, title string, message string) error {
    appId := os.Getenv("ONESIGNAL_APP_ID")
    apiKey := os.Getenv("ONESIGNAL_API_KEY")

    if appId == "" || apiKey == "" {
        return fmt.Errorf("OneSignal non configuré")
    }

    payload := map[string]interface{}{
        "app_id":             appId,
        "include_player_ids": playerIds,
        "headings":           map[string]string{"en": title, "fr": title},
        "contents":           map[string]string{"en": message, "fr": message},
        "url":                "http://localhost/UpcycleConnect-/EspacePro/index.html",
    }

    body, _ := json.Marshal(payload)
    req, _ := http.NewRequest("POST", "https://onesignal.com/api/v1/notifications", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Basic "+apiKey)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return fmt.Errorf("OneSignal request : %v", err)
    }
    defer resp.Body.Close()

    fmt.Printf("[OneSignal] Notification envoyée → status %d\n", resp.StatusCode)
    return nil
}