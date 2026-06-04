CREATE TABLE travel_plans (
    id VARCHAR(50) PRIMARY KEY,
    family_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    ai_ideas TEXT
);

CREATE TABLE travel_destinations (
    id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    day_index INTEGER NOT NULL,
    notes VARCHAR(200),
    CONSTRAINT fk_destination_plan FOREIGN KEY (plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
);

CREATE TABLE travel_checklist_items (
    id VARCHAR(50) PRIMARY KEY,
    plan_id VARCHAR(50) NOT NULL,
    task VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_checklist_plan FOREIGN KEY (plan_id) REFERENCES travel_plans(id) ON DELETE CASCADE
);
