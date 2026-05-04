package limiter

import "time"

type Rate struct {
	Period time.Duration
	Limit  int64
}

type Store interface{}

type Limiter struct {
	store Store
	rate  Rate
}

func New(store Store, rate Rate) *Limiter {
	return &Limiter{store: store, rate: rate}
}
