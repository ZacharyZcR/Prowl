package queue

import (
	"testing"
	"time"
)

func TestSubscribeUnsubscribeReturnsImmediately(t *testing.T) {
	q := &Queue{subscribers: make(map[chan TaskEvent]struct{})}
	_, unsub := q.Subscribe()

	done := make(chan struct{})
	go func() {
		unsub()
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(200 * time.Millisecond):
		t.Fatal("unsubscribe should not block")
	}
}

func TestBroadcastDeliversToSubscribers(t *testing.T) {
	q := &Queue{subscribers: make(map[chan TaskEvent]struct{})}
	ch, unsub := q.Subscribe()
	defer unsub()

	event := TaskEvent{TaskID: "1", Name: "test", Status: "running"}
	q.broadcast(event)

	select {
	case got := <-ch:
		if got.TaskID != "1" || got.Status != "running" {
			t.Fatalf("unexpected event: %+v", got)
		}
	case <-time.After(200 * time.Millisecond):
		t.Fatal("expected event not received")
	}
}
