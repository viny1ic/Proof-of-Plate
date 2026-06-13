module tracebite::tracebite {
    use std::string::String;
    use sui::clock::Clock;
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const STATUS_PENDING: u8 = 0;
    const STATUS_VERIFIED: u8 = 1;
    const STATUS_WARNING: u8 = 2;
    const STATUS_FAILED: u8 = 3;
    const STATUS_REVOKED: u8 = 4;

    public struct ProductBatch has key, store {
        id: UID,
        batch_id: String,
        product_name: String,
        hcs_topic_id: String,
        score_verified: u64,
        score_total: u64,
        recalled: bool,
        created_at_ms: u64,
    }

    public struct Claim has key, store {
        id: UID,
        batch_id: String,
        claim_type: String,
        label: String,
        status: u8,
        issuer_role: String,
        issuer_name: String,
        evidence_uri: String,
        evidence_hash: vector<u8>,
        hcs_topic_id: String,
        hcs_sequence: u64,
        created_at_ms: u64,
    }

    public struct BatchCreated has copy, drop {
        batch_id: String,
        product_name: String,
        hcs_topic_id: String,
        created_at_ms: u64,
    }

    public struct ClaimAdded has copy, drop {
        batch_id: String,
        claim_type: String,
        status: u8,
        hcs_topic_id: String,
        hcs_sequence: u64,
    }

    public struct ScoreUpdated has copy, drop {
        batch_id: String,
        verified: u64,
        total: u64,
    }

    public struct BatchRecalled has copy, drop {
        batch_id: String,
    }

    public entry fun create_batch(
        batch_id: String,
        product_name: String,
        hcs_topic_id: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let created_at_ms = sui::clock::timestamp_ms(clock);
        let batch = ProductBatch {
            id: object::new(ctx),
            batch_id,
            product_name,
            hcs_topic_id,
            score_verified: 0,
            score_total: 0,
            recalled: false,
            created_at_ms,
        };

        event::emit(BatchCreated {
            batch_id: batch.batch_id,
            product_name: batch.product_name,
            hcs_topic_id: batch.hcs_topic_id,
            created_at_ms,
        });

        transfer::share_object(batch);
    }

    public entry fun add_claim(
        batch_id: String,
        claim_type: String,
        label: String,
        status: u8,
        issuer_role: String,
        issuer_name: String,
        evidence_uri: String,
        evidence_hash: vector<u8>,
        hcs_topic_id: String,
        hcs_sequence: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let claim = Claim {
            id: object::new(ctx),
            batch_id,
            claim_type,
            label,
            status,
            issuer_role,
            issuer_name,
            evidence_uri,
            evidence_hash,
            hcs_topic_id,
            hcs_sequence,
            created_at_ms: sui::clock::timestamp_ms(clock),
        };

        event::emit(ClaimAdded {
            batch_id: claim.batch_id,
            claim_type: claim.claim_type,
            status,
            hcs_topic_id: claim.hcs_topic_id,
            hcs_sequence,
        });

        transfer::share_object(claim);
    }

    public entry fun update_score(batch: &mut ProductBatch, verified: u64, total: u64) {
        batch.score_verified = verified;
        batch.score_total = total;
        event::emit(ScoreUpdated {
            batch_id: batch.batch_id,
            verified,
            total,
        });
    }

    public entry fun recall_batch(batch: &mut ProductBatch) {
        batch.recalled = true;
        event::emit(BatchRecalled { batch_id: batch.batch_id });
    }

    public fun status_pending(): u8 { STATUS_PENDING }
    public fun status_verified(): u8 { STATUS_VERIFIED }
    public fun status_warning(): u8 { STATUS_WARNING }
    public fun status_failed(): u8 { STATUS_FAILED }
    public fun status_revoked(): u8 { STATUS_REVOKED }
}
